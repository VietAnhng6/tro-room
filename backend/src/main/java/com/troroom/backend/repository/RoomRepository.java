package com.troroom.backend.repository;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {

    // Phòng của một tòa nhà
    List<Room> findByBuilding(Building building);

    // Phòng của một tòa nhà theo tầng
    List<Room> findByBuildingAndFloor(
            Building building,
            int floor
    );

    // Phòng theo mã trong một tòa nhà
    Optional<Room> findByBuildingAndCode(
            Building building,
            String code
    );

    // Kiểm tra mã phòng đã tồn tại trong tòa nhà
    boolean existsByBuildingAndCode(
            Building building,
            String code
    );

    // Đếm tổng số phòng của tòa nhà
    long countByBuilding(Building building);

    // Đếm phòng theo trạng thái
    long countByBuildingAndStatus(
            Building building,
            Room.Status status
    );

    // =========================================================
    // Lấy phòng theo chủ nhà
    // =========================================================

    List<Room> findByBuilding_Landlord(User landlord);

    // =========================================================
    // Lấy phòng theo quản lý được giao
    // =========================================================

    List<Room> findByBuilding_Manager(User manager);

    // =========================================================
    // Lấy phòng theo chủ nhà + tầng
    // =========================================================

    List<Room> findByBuilding_LandlordAndFloor(
            User landlord,
            int floor
    );

    // =========================================================
    // Lấy phòng theo quản lý + tầng
    // =========================================================

    List<Room> findByBuilding_ManagerAndFloor(
            User manager,
            int floor
    );
}