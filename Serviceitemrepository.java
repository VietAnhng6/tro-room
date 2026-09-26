package com.troroom.backend.repository;

import com.troroom.backend.entity.Serviceitem;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface Serviceitemrepository extends JpaRepository<Serviceitem, Long> {

    List<Serviceitem> findByLandlord(User landlord);

    boolean existsByLandlordAndNameIgnoreCase(User landlord, String name);
}