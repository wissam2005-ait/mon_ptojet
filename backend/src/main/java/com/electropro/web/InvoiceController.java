package com.electropro.web;

import com.electropro.domain.Invoice;
import com.electropro.domain.InvoiceLine;
import com.electropro.domain.Repositories.InvoiceLineRepository;
import com.electropro.domain.Repositories.InvoiceRepository;
import com.electropro.service.InvoiceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Factures (dirigeant uniquement). */
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    record ExtraLineInput(
            @NotBlank @Size(max = 300) String description,
            @Size(max = 20) String unit,
            @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal quantity,
            @NotNull @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal unitPrice) {}

    record GenerateInput(
            @NotNull Long projectId,
            @NotNull @PositiveOrZero @DecimalMax("1000") @Digits(integer = 4, fraction = 2) BigDecimal markupPercent,
            @NotNull @PositiveOrZero @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal vatRate,
            LocalDate dueDate,
            @Size(max = 2000) String notes,
            List<@Valid ExtraLineInput> extraLines) {}

    record PaidInput(boolean paid) {}

    record LineView(String description, String unit, BigDecimal quantity, BigDecimal unitPrice, BigDecimal total) {
        static LineView of(InvoiceLine l) {
            return new LineView(l.getDescription(), l.getUnit(), l.getQuantity(), l.getUnitPrice(),
                    l.getQuantity().multiply(l.getUnitPrice()).setScale(2, java.math.RoundingMode.HALF_UP));
        }
    }

    record InvoiceView(Long id, String number, Long projectId, Long clientId, LocalDate issueDate, LocalDate dueDate,
                       Invoice.Status status, BigDecimal vatRate, BigDecimal totalHt, BigDecimal totalVat,
                       BigDecimal totalTtc, String notes, List<LineView> lines) {
        static InvoiceView of(Invoice i, List<InvoiceLine> lines) {
            return new InvoiceView(i.getId(), i.getNumber(), i.getProjectId(), i.getClientId(), i.getIssueDate(),
                    i.getDueDate(), i.getStatus(), i.getVatRate(), i.getTotalHt(), i.getTotalVat(), i.getTotalTtc(),
                    i.getNotes(), lines.stream().map(LineView::of).toList());
        }
    }

    private final InvoiceRepository invoices;
    private final InvoiceLineRepository lines;
    private final InvoiceService service;

    InvoiceController(InvoiceRepository invoices, InvoiceLineRepository lines, InvoiceService service) {
        this.invoices = invoices;
        this.lines = lines;
        this.service = service;
    }

    /** Liste sans le détail des lignes. */
    @GetMapping
    List<InvoiceView> list() {
        return invoices.findAllByOrderByIdDesc().stream().map(i -> InvoiceView.of(i, List.of())).toList();
    }

    @GetMapping("/{id}")
    InvoiceView get(@PathVariable Long id) {
        Invoice i = invoices.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable."));
        return InvoiceView.of(i, lines.findByInvoiceIdOrderByPositionAsc(id));
    }

    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    InvoiceView generate(@Valid @RequestBody GenerateInput in) {
        List<InvoiceService.ExtraLine> extras = in.extraLines() == null ? List.of()
                : in.extraLines().stream().map(e -> new InvoiceService.ExtraLine(e.description(), e.unit(), e.quantity(), e.unitPrice())).toList();
        Invoice i = service.generate(new InvoiceService.Command(in.projectId(), in.markupPercent(), in.vatRate(), in.dueDate(), in.notes(), extras));
        return get(i.getId());
    }

    @PostMapping("/{id}/issue")
    InvoiceView issue(@PathVariable Long id) {
        service.issue(id);
        return get(id);
    }

    @PostMapping("/{id}/paid")
    InvoiceView paid(@PathVariable Long id, @RequestBody PaidInput in) {
        service.setPaid(id, in.paid());
        return get(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id) {
        service.deleteDraft(id);
    }
}
