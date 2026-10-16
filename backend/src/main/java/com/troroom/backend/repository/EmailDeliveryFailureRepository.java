
package com.troroom.backend.repository;

import com.troroom.backend.entity.EmailDeliveryFailure;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailDeliveryFailureRepository
        extends JpaRepository<EmailDeliveryFailure, Long> {

    List<EmailDeliveryFailure> findAllByOrderByCreatedAtDesc();

    List<EmailDeliveryFailure> findByResolvedFalseOrderByCreatedAtDesc();
}
