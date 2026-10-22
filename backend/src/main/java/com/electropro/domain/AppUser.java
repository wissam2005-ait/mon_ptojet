package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "app_users")
@Getter
@Setter
public class AppUser {
    public enum Role { ADMIN, EMPLOYEE, INTERN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    @Enumerated(EnumType.STRING)
    private Role role = Role.EMPLOYEE;

    private String phone;

    @Column(name = "job_title")
    private String jobTitle;

    private boolean active = true;
}
