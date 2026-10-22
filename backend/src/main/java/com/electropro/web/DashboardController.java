package com.electropro.web;

import com.electropro.domain.ContactRequest;
import com.electropro.domain.Project;
import com.electropro.domain.Repositories.*;
import com.electropro.domain.Task;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    record Summary(long newRequests, long activeProjects, long clients, long activeAccounts, long openTasks) {}

    private final ContactRequestRepository requests;
    private final ProjectRepository projects;
    private final ClientRepository clients;
    private final UserRepository users;
    private final TaskRepository tasks;

    DashboardController(ContactRequestRepository requests, ProjectRepository projects, ClientRepository clients,
                        UserRepository users, TaskRepository tasks) {
        this.requests = requests;
        this.projects = projects;
        this.clients = clients;
        this.users = users;
        this.tasks = tasks;
    }

    @GetMapping
    Summary summary() {
        return new Summary(
                requests.countByStatus(ContactRequest.Status.NEW),
                projects.countByStatus(Project.Status.IN_PROGRESS),
                clients.countByArchivedFalse(),
                users.countByActiveTrue(),
                tasks.countByStatusNot(Task.Status.DONE));
    }
}
