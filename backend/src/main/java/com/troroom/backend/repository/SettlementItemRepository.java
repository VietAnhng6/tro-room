package com.troroom.backend.repository;

import com.troroom.backend.entity.Settlement;
import com.troroom.backend.entity.SettlementItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementItemRepository extends JpaRepository<SettlementItem, Long> {

    List<SettlementItem> findBySettlementOrderByIdAsc(Settlement settlement);
}
