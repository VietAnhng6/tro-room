package com.troroom.backend.repository;

import com.troroom.backend.entity.Serviceitem;
import com.troroom.backend.entity.ServicePrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface Servicepricerepository extends JpaRepository<ServicePrice, Long> {

    List<ServicePrice> findByServiceItemOrderByEffectiveFromDesc(Serviceitem serviceItem);

    // Đơn giá đang áp dụng tại một ngày cụ thể: bản ghi có effectiveFrom gần nhất
    // mà vẫn <= ngày đó.
    Optional<ServicePrice> findFirstByServiceItemAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
            Serviceitem serviceItem,
            LocalDate atDate
    );
}