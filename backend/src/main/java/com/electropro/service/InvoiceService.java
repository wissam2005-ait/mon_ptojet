package com.electropro.service;

import com.electropro.domain.Invoice;
import com.electropro.domain.InvoiceCounter;
import com.electropro.domain.InvoiceLine;
import com.electropro.domain.Material;
import com.electropro.domain.Project;
import com.electropro.domain.Repositories.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class InvoiceService {
    public record ExtraLine(String description, String unit, BigDecimal quantity, BigDecimal unitPrice) {}

    public record Command(Long projectId, BigDecimal markupPercent, BigDecimal vatRate, LocalDate dueDate,
                          String notes, List<ExtraLine> extraLines) {}

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final InvoiceRepository invoices;
    private final InvoiceLineRepository lines;
    private final InvoiceCounterRepository counters;
    private final MaterialRepository materials;
    private final ProjectRepository projects;

    public InvoiceService(InvoiceRepository invoices, InvoiceLineRepository lines, InvoiceCounterRepository counters,
                          MaterialRepository materials, ProjectRepository projects) {
        this.invoices = invoices;
        this.lines = lines;
        this.counters = counters;
        this.materials = materials;
        this.projects = projects;
    }

    /**
     * Crée un brouillon de facture à partir du matériel acheté et pas encore facturé du chantier
     * (prix d'achat + marge), plus d'éventuelles lignes libres (main d'œuvre, déplacement…).
     */
    @Transactional
    public Invoice generate(Command c) {
        Project project = projects.findById(c.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chantier inconnu."));
        List<Material> billable = materials.findByProjectIdAndPurchasedOnIsNotNullAndInvoiceIdIsNullOrderByIdAsc(project.getId());
        List<ExtraLine> extras = c.extraLines() == null ? List.of() : c.extraLines();
        if (billable.isEmpty() && extras.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Aucun matériel acheté et non facturé sur ce chantier, et aucune ligne ajoutée.");
        }

        BigDecimal factor = BigDecimal.ONE.add(c.markupPercent().divide(HUNDRED, 6, RoundingMode.HALF_UP));
        List<InvoiceLine> built = new ArrayList<>();
        int pos = 0;
        for (Material m : billable) {
            InvoiceLine l = new InvoiceLine();
            l.setPosition(pos++);
            l.setDescription(m.getName());
            l.setUnit(m.getUnit());
            l.setQuantity(m.getQuantity());
            l.setUnitPrice(m.getUnitCost().multiply(factor).setScale(2, RoundingMode.HALF_UP));
            built.add(l);
        }
        for (ExtraLine e : extras) {
            InvoiceLine l = new InvoiceLine();
            l.setPosition(pos++);
            l.setDescription(e.description().trim());
            l.setUnit(e.unit() == null || e.unit().isBlank() ? null : e.unit().trim());
            l.setQuantity(e.quantity());
            l.setUnitPrice(e.unitPrice().setScale(2, RoundingMode.HALF_UP));
            built.add(l);
        }

        BigDecimal ht = built.stream()
                .map(l -> l.getQuantity().multiply(l.getUnitPrice()).setScale(2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal vat = ht.multiply(c.vatRate()).divide(HUNDRED, 2, RoundingMode.HALF_UP);

        Invoice inv = new Invoice();
        inv.setProjectId(project.getId());
        inv.setClientId(project.getClientId());
        inv.setDueDate(c.dueDate());
        inv.setVatRate(c.vatRate());
        inv.setTotalHt(ht);
        inv.setTotalVat(vat);
        inv.setTotalTtc(ht.add(vat));
        inv.setNotes(c.notes() == null || c.notes().isBlank() ? null : c.notes().trim());
        inv = invoices.save(inv);

        for (InvoiceLine l : built) l.setInvoiceId(inv.getId());
        lines.saveAll(built);

        for (Material m : billable) m.setInvoiceId(inv.getId());
        materials.saveAll(billable);
        return inv;
    }

    /** Émet la facture : date du jour + prochain numéro de la série de l'année (sans trou). */
    @Transactional
    public Invoice issue(Long id) {
        Invoice inv = find(id);
        if (inv.getStatus() != Invoice.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette facture est déjà émise.");
        }
        LocalDate today = LocalDate.now();
        InvoiceCounter counter = counters.lockByYear(today.getYear()).orElseGet(() -> {
            InvoiceCounter n = new InvoiceCounter();
            n.setInvoiceYear(today.getYear());
            n.setLastNumber(0);
            return n;
        });
        counter.setLastNumber(counter.getLastNumber() + 1);
        counters.save(counter);

        inv.setNumber(String.format("FA-%d-%04d", today.getYear(), counter.getLastNumber()));
        inv.setIssueDate(today);
        if (inv.getDueDate() != null && inv.getDueDate().isBefore(today)) inv.setDueDate(today);
        inv.setStatus(Invoice.Status.SENT);
        return invoices.save(inv);
    }

    @Transactional
    public Invoice setPaid(Long id, boolean paid) {
        Invoice inv = find(id);
        if (inv.getStatus() == Invoice.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Émettez d'abord la facture.");
        }
        inv.setStatus(paid ? Invoice.Status.PAID : Invoice.Status.SENT);
        return invoices.save(inv);
    }

    /** Seul un brouillon peut être supprimé ; son matériel redevient facturable. */
    @Transactional
    public void deleteDraft(Long id) {
        Invoice inv = find(id);
        if (inv.getStatus() != Invoice.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une facture émise ne peut pas être supprimée.");
        }
        List<Material> linked = materials.findByInvoiceId(id);
        linked.forEach(m -> m.setInvoiceId(null));
        materials.saveAll(linked);
        lines.deleteByInvoiceId(id);
        invoices.delete(inv);
    }

    private Invoice find(Long id) {
        return invoices.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable."));
    }
}
