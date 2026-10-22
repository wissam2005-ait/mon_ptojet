package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Material;
import com.electropro.domain.Project;
import com.electropro.domain.Repositories.MaterialRepository;
import com.electropro.domain.Repositories.ProjectRepository;
import com.electropro.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Matériel nécessaire par chantier, saisi dans l'application (plus de tableur).
 * Les personnes affectées au chantier ajoutent le besoin ; seul le dirigeant renseigne l'achat et les prix.
 */
@RestController
@RequestMapping("/api/materials")
public class MaterialController {
    record MaterialInput(
            @NotNull Long projectId,
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 20) String unit,
            @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal quantity) {}

    record QuantityInput(@NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal quantity) {}

    record PurchaseInput(
            @NotNull @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal unitCost,
            @NotNull LocalDate purchasedOn,
            @Size(max = 150) String supplier) {}

    /** unitCost est masqué (null) pour les non-dirigeants. */
    record MaterialView(Long id, Long projectId, String name, String unit, BigDecimal quantity, String supplier,
                        BigDecimal unitCost, LocalDate purchasedOn, Long invoiceId) {
        static MaterialView of(Material m, boolean admin) {
            return new MaterialView(m.getId(), m.getProjectId(), m.getName(), m.getUnit(), m.getQuantity(),
                    admin ? m.getSupplier() : null, admin ? m.getUnitCost() : null, m.getPurchasedOn(), m.getInvoiceId());
        }
    }

    private final MaterialRepository materials;
    private final ProjectRepository projects;
    private final CurrentUser current;

    MaterialController(MaterialRepository materials, ProjectRepository projects, CurrentUser current) {
        this.materials = materials;
        this.projects = projects;
        this.current = current;
    }

    @GetMapping
    List<MaterialView> list(@RequestParam Long projectId, Authentication auth) {
        AppUser me = current.of(auth);
        checkAccess(projectId, me);
        boolean admin = me.getRole() == AppUser.Role.ADMIN;
        return materials.findByProjectIdOrderByIdAsc(projectId).stream().map(m -> MaterialView.of(m, admin)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    MaterialView add(@Valid @RequestBody MaterialInput in, Authentication auth) {
        AppUser me = current.of(auth);
        checkAccess(in.projectId(), me);
        Material m = new Material();
        m.setProjectId(in.projectId());
        m.setName(in.name().trim());
        m.setUnit(in.unit().trim());
        m.setQuantity(in.quantity());
        m.setAddedBy(me.getId());
        return MaterialView.of(materials.save(m), me.getRole() == AppUser.Role.ADMIN);
    }

    @PutMapping("/{id}")
    MaterialView updateQuantity(@PathVariable Long id, @Valid @RequestBody QuantityInput in, Authentication auth) {
        AppUser me = current.of(auth);
        Material m = find(id);
        checkAccess(m.getProjectId(), me);
        if (m.isPurchased()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel est déjà acheté.");
        m.setQuantity(in.quantity());
        return MaterialView.of(materials.save(m), me.getRole() == AppUser.Role.ADMIN);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id, Authentication auth) {
        AppUser me = current.of(auth);
        Material m = find(id);
        checkAccess(m.getProjectId(), me);
        if (m.getInvoiceId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel figure sur une facture.");
        if (m.isPurchased() && me.getRole() != AppUser.Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce matériel est déjà acheté.");
        }
        materials.delete(m);
    }

    /** Dirigeant : enregistre l'achat (prix HT à l'unité, date, fournisseur). */
    @PostMapping("/{id}/purchase")
    MaterialView purchase(@PathVariable Long id, @Valid @RequestBody PurchaseInput in) {
        Material m = find(id);
        if (m.getInvoiceId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel figure sur une facture.");
        m.setUnitCost(in.unitCost());
        m.setPurchasedOn(in.purchasedOn());
        m.setSupplier(in.supplier() == null || in.supplier().isBlank() ? null : in.supplier().trim());
        return MaterialView.of(materials.save(m), true);
    }

    /** Dirigeant : annule un achat saisi par erreur (impossible une fois facturé). */
    @DeleteMapping("/{id}/purchase")
    MaterialView cancelPurchase(@PathVariable Long id) {
        Material m = find(id);
        if (m.getInvoiceId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel figure sur une facture.");
        m.setUnitCost(null);
        m.setPurchasedOn(null);
        m.setSupplier(null);
        return MaterialView.of(materials.save(m), true);
    }

    private Material find(Long id) {
        return materials.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Matériel introuvable."));
    }

    private void checkAccess(Long projectId, AppUser me) {
        Project p = projects.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chantier introuvable."));
        if (me.getRole() != AppUser.Role.ADMIN && !p.getMemberIds().contains(me.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chantier introuvable.");
        }
    }
}
