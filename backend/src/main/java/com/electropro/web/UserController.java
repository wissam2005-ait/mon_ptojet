package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Gestion des comptes employés (dirigeant uniquement). Le hash du mot de passe n'est jamais renvoyé. */
@RestController
@RequestMapping("/api/users")
public class UserController {
    record UserView(Long id, String email, String fullName, AppUser.Role role, String phone, String jobTitle, boolean active) {
        static UserView of(AppUser u) {
            return new UserView(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getPhone(), u.getJobTitle(), u.isActive());
        }
    }

    record CreateInput(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 150) String fullName,
            @NotNull AppUser.Role role,
            @Size(max = 30) String phone,
            @Size(max = 100) String jobTitle,
            @NotBlank @Size(min = 10, max = 72, message = "10 à 72 caractères") String password) {}

    record UpdateInput(
            @NotBlank @Size(max = 150) String fullName,
            @NotNull AppUser.Role role,
            @Size(max = 30) String phone,
            @Size(max = 100) String jobTitle) {}

    record ActiveInput(boolean active) {}

    record PasswordInput(@NotBlank @Size(min = 10, max = 72, message = "10 à 72 caractères") String password) {}

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final CurrentUser current;

    UserController(UserRepository users, PasswordEncoder encoder, CurrentUser current) {
        this.users = users;
        this.encoder = encoder;
        this.current = current;
    }

    @GetMapping
    List<UserView> list() {
        return users.findAllByOrderByFullNameAsc().stream().map(UserView::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    UserView create(@Valid @RequestBody CreateInput in) {
        String email = in.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà avec cet e-mail.");
        }
        AppUser u = new AppUser();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(in.password()));
        apply(u, in.fullName(), in.role(), in.phone(), in.jobTitle());
        return UserView.of(users.save(u));
    }

    @PutMapping("/{id}")
    UserView update(@PathVariable Long id, @Valid @RequestBody UpdateInput in) {
        AppUser u = find(id);
        if (u.getRole() == AppUser.Role.ADMIN && in.role() != AppUser.Role.ADMIN) {
            ensureAnotherAdmin(u);
        }
        apply(u, in.fullName(), in.role(), in.phone(), in.jobTitle());
        return UserView.of(users.save(u));
    }

    @PostMapping("/{id}/active")
    UserView setActive(@PathVariable Long id, @RequestBody ActiveInput in, Authentication auth) {
        AppUser u = find(id);
        if (!in.active()) {
            if (u.getId().equals(current.of(auth).getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous ne pouvez pas désactiver votre propre compte.");
            }
            ensureAnotherAdmin(u);
        }
        u.setActive(in.active());
        return UserView.of(users.save(u));
    }

    @PostMapping("/{id}/password")
    UserView resetPassword(@PathVariable Long id, @Valid @RequestBody PasswordInput in) {
        AppUser u = find(id);
        u.setPasswordHash(encoder.encode(in.password()));
        return UserView.of(users.save(u));
    }

    private AppUser find(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte introuvable."));
    }

    private void ensureAnotherAdmin(AppUser target) {
        if (target.getRole() == AppUser.Role.ADMIN && target.isActive()
                && users.countByRoleAndActiveTrue(AppUser.Role.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Il doit rester au moins un dirigeant actif.");
        }
    }

    private static void apply(AppUser u, String fullName, AppUser.Role role, String phone, String jobTitle) {
        u.setFullName(fullName.trim());
        u.setRole(role);
        u.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        u.setJobTitle(jobTitle == null || jobTitle.isBlank() ? null : jobTitle.trim());
    }
}
