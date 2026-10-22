package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "invoices")
@Getter
@Setter
public class Invoice {
    public enum Status { DRAFT, SENT, PAID }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Attribué à l'émission seulement : la numérotation légale ne doit pas avoir de trou. */
    private String number;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "client_id")
    private Long clientId;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    private Status status = Status.DRAFT;

    @Column(name = "vat_rate")
    private BigDecimal vatRate;

    @Column(name = "total_ht")
    private BigDecimal totalHt;

    @Column(name = "total_vat")
    private BigDecimal totalVat;

    @Column(name = "total_ttc")
    private BigDecimal totalTtc;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
