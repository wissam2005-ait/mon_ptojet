package com.electropro.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public final class Repositories {
    private Repositories() {}

    public interface UserRepository extends JpaRepository<AppUser, Long> {
        Optional<AppUser> findByEmailIgnoreCase(String email);

        boolean existsByEmailIgnoreCase(String email);

        List<AppUser> findAllByOrderByFullNameAsc();

        long countByActiveTrue();

        long countByRoleAndActiveTrue(AppUser.Role role);
    }

    public interface ClientRepository extends JpaRepository<Client, Long> {
        List<Client> findByArchivedFalseOrderByNameAsc();

        @Query("select c from Client c where c.archived = false and (lower(c.name) like lower(concat('%', :q, '%')) or lower(coalesce(c.email, '')) like lower(concat('%', :q, '%'))) order by c.name")
        List<Client> search(@Param("q") String q);

        long countByArchivedFalse();
    }

    public interface ContactRequestRepository extends JpaRepository<ContactRequest, Long> {
        List<ContactRequest> findAllByOrderByCreatedAtDesc();

        List<ContactRequest> findByStatusOrderByCreatedAtDesc(ContactRequest.Status status);

        long countByStatus(ContactRequest.Status status);
    }

    public interface ProjectRepository extends JpaRepository<Project, Long> {
        List<Project> findAllByOrderByCreatedAtDesc();

        @Query("select p from Project p where :userId member of p.memberIds order by p.createdAt desc")
        List<Project> findForMember(@Param("userId") Long userId);

        long countByStatus(Project.Status status);
    }

    public interface TaskRepository extends JpaRepository<Task, Long> {
        List<Task> findAllByOrderByDueDateAscIdAsc();

        List<Task> findByAssigneeIdOrderByDueDateAscIdAsc(Long assigneeId);

        boolean existsByProjectIdAndAssigneeIdAndStatusNot(Long projectId, Long assigneeId, Task.Status status);

        long countByStatusNot(Task.Status status);
    }

    public interface SalarySettingRepository extends JpaRepository<SalarySetting, Long> {}

    public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {
        List<SalaryPayment> findByPeriod(String period);

        List<SalaryPayment> findByUserIdOrderByPaidOnDescIdDesc(Long userId);
    }

    public interface MaterialRepository extends JpaRepository<Material, Long> {
        List<Material> findByProjectIdOrderByIdAsc(Long projectId);

        /** Acheté mais pas encore facturé. */
        List<Material> findByProjectIdAndPurchasedOnIsNotNullAndInvoiceIdIsNullOrderByIdAsc(Long projectId);

        List<Material> findByInvoiceId(Long invoiceId);
    }

    public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
        List<Invoice> findAllByOrderByIdDesc();
    }

    public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {
        List<InvoiceLine> findByInvoiceIdOrderByPositionAsc(Long invoiceId);

        void deleteByInvoiceId(Long invoiceId);
    }

    public interface InvoiceCounterRepository extends JpaRepository<InvoiceCounter, Integer> {
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select c from InvoiceCounter c where c.invoiceYear = :y")
        Optional<InvoiceCounter> lockByYear(@Param("y") int year);
    }

    public interface RealisationRepository extends JpaRepository<Realisation, Long> {
        List<Realisation> findAllByOrderByIdDesc();

        List<Realisation> findByAuthorIdOrderByIdDesc(Long authorId);

        List<Realisation> findByPublishedTrueOrderByCompletedOnDescIdDesc();
    }

    public interface RealisationPhotoRepository extends JpaRepository<RealisationPhoto, Long> {
        List<RealisationPhoto> findByRealisationIdInOrderByPositionAsc(Collection<Long> realisationIds);

        List<RealisationPhoto> findByRealisationIdOrderByPositionAsc(Long realisationId);
    }
}
