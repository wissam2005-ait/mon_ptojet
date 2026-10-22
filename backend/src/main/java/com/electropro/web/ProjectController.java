package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Project;
import com.electropro.domain.Repositories.ClientRepository;
import com.electropro.domain.Repositories.ProjectRepository;
import com.electropro.domain.Repositories.TaskRepository;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.domain.Task;
import com.electropro.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    record ProjectInput(
            @NotBlank @Size(max = 200) String name,
            @NotNull Long clientId,
            @Size(max = 300) String address,
            @Size(max = 5000) String description,
            LocalDate startDate,
            LocalDate endDate,
            Project.Status status,
            @PositiveOrZero BigDecimal budget) {}

    record StatusInput(@NotNull Project.Status status) {}

    record MembersInput(@NotNull Set<Long> userIds) {}

    private final ProjectRepository projects;
    private final ClientRepository clients;
    private final UserRepository users;
    private final TaskRepository tasks;
    private final CurrentUser current;

    ProjectController(ProjectRepository projects, ClientRepository clients, UserRepository users,
                      TaskRepository tasks, CurrentUser current) {
        this.projects = projects;
        this.clients = clients;
        this.users = users;
        this.tasks = tasks;
        this.current = current;
    }

    /** Dirigeant : tous les chantiers. Employé ou stagiaire : uniquement ceux où il est affecté. */
    @GetMapping
    List<Project> list(Authentication auth) {
        AppUser me = current.of(auth);
        return me.getRole() == AppUser.Role.ADMIN
                ? projects.findAllByOrderByCreatedAtDesc()
                : projects.findForMember(me.getId());
    }

    @GetMapping("/{id}")
    Project get(@PathVariable Long id, Authentication auth) {
        Project p = find(id);
        AppUser me = current.of(auth);
        if (me.getRole() != AppUser.Role.ADMIN && !p.getMemberIds().contains(me.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chantier introuvable.");
        }
        return p;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Project create(@Valid @RequestBody ProjectInput in) {
        return projects.save(apply(new Project(), in));
    }

    @PutMapping("/{id}")
    Project update(@PathVariable Long id, @Valid @RequestBody ProjectInput in) {
        return projects.save(apply(find(id), in));
    }

    @PatchMapping("/{id}/status")
    Project setStatus(@PathVariable Long id, @Valid @RequestBody StatusInput in) {
        Project p = find(id);
        p.setStatus(in.status());
        return projects.save(p);
    }

    /** Remplace l'équipe du chantier. Refus si une personne retirée a encore des tâches non terminées dessus. */
    @PutMapping("/{id}/members")
    Project setMembers(@PathVariable Long id, @Valid @RequestBody MembersInput in) {
        Project p = find(id);
        List<AppUser> found = users.findAllById(in.userIds());
        if (found.size() != in.userIds().size() || found.stream().anyMatch(u -> !u.isActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Un des comptes est introuvable ou désactivé.");
        }
        Set<Long> removed = new HashSet<>(p.getMemberIds());
        removed.removeAll(in.userIds());
        for (Long userId : removed) {
            if (tasks.existsByProjectIdAndAssigneeIdAndStatusNot(id, userId, Task.Status.DONE)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Une personne retirée a encore des tâches non terminées sur ce chantier.");
            }
        }
        p.getMemberIds().clear();
        p.getMemberIds().addAll(in.userIds());
        return projects.save(p);
    }

    private Project find(Long id) {
        return projects.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chantier introuvable."));
    }

    private Project apply(Project p, ProjectInput in) {
        if (!clients.existsById(in.clientId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client inconnu.");
        }
        if (in.startDate() != null && in.endDate() != null && in.endDate().isBefore(in.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de fin précède la date de début.");
        }
        p.setName(in.name().trim());
        p.setClientId(in.clientId());
        p.setAddress(blank(in.address()));
        p.setDescription(blank(in.description()));
        p.setStartDate(in.startDate());
        p.setEndDate(in.endDate());
        if (in.status() != null) p.setStatus(in.status());
        p.setBudget(in.budget());
        return p;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
