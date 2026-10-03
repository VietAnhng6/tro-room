package com.troroom.backend.config;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.RentalRequestRepository;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.repository.UserRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Configuration
public class DemoDataInitializer {

    @Bean
    CommandLineRunner initDemoData(
            UserRepository userRepository,
            BuildingRepository buildingRepository,
            RoomRepository roomRepository,
            ListingRepository listingRepository,
            RentalRequestRepository rentalRequestRepository,
            PasswordEncoder passwordEncoder
    ) {

        return args -> {

            // Idempotent: chỉ tạo khi chưa có tin đăng nào
            if (listingRepository.count() > 0) {
                return;
            }

            User landlord = getOrCreateUser(
                    userRepository,
                    passwordEncoder,
                    "0900000001",
                    "Chủ trọ Demo",
                    User.Role.LANDLORD
            );

            Building building = new Building();
            building.setName("Nhà trọ Demo");
            building.setAddress("123 Đường Láng, Đống Đa, Hà Nội");
            building.setFloors(3);
            building.setLandlord(landlord);
            building.setActive(true);
            buildingRepository.save(building);

            Room room = new Room();
            room.setCode("101");
            room.setBuilding(building);
            room.setFloor(1);
            room.setArea(25.0);
            room.setRent(2500000);
            room.setMaxPeople(2);
            room.setStatus(Room.Status.EMPTY);
            roomRepository.save(room);

            Listing listing = new Listing();
            listing.setTitle("Phòng trọ 25m² gần trung tâm, đầy đủ nội thất");
            listing.setDescription(
                    "Phòng sạch sẽ, thoáng mát, có gác lửng, "
                            + "bếp riêng, vệ sinh khép kín."
            );
            listing.setRoom(room);
            listing.setStatus(Listing.ListingStatus.VISIBLE);
            listing.setExpiresAt(LocalDate.now().plusDays(30));
            listing.setCreatedAt(LocalDateTime.now());
            listingRepository.save(listing);

            User tenant = getOrCreateUser(
                    userRepository,
                    passwordEncoder,
                    "0900000002",
                    "Khách thuê Demo",
                    User.Role.TENANT
            );

            createRequest(
                    rentalRequestRepository,
                    tenant,
                    listing,
                    "YC-" + yearMonth() + "-0001",
                    RentalRequest.RequestType.VIEW,
                    RentalRequest.RequestStatus.NEW,
                    LocalDate.now().plusDays(3),
                    null,
                    null
            );

            createRequest(
                    rentalRequestRepository,
                    tenant,
                    listing,
                    "YC-" + yearMonth() + "-0002",
                    RentalRequest.RequestType.VIEW,
                    RentalRequest.RequestStatus.SCHEDULED,
                    LocalDate.now().plusDays(4),
                    LocalDateTime.now().plusDays(1).withHour(9).withMinute(0),
                    null
            );

            createRequest(
                    rentalRequestRepository,
                    tenant,
                    listing,
                    "YC-" + yearMonth() + "-0003",
                    RentalRequest.RequestType.RENT_NOW,
                    RentalRequest.RequestStatus.REJECTED,
                    LocalDate.now().plusDays(2),
                    null,
                    "Đã có khách thuê"
            );

            createRequest(
                    rentalRequestRepository,
                    tenant,
                    listing,
                    "YC-" + yearMonth() + "-0004",
                    RentalRequest.RequestType.RENT_NOW,
                    RentalRequest.RequestStatus.APPROVED,
                    LocalDate.now().plusDays(5),
                    null,
                    null
            );
        };
    }

    private User getOrCreateUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String phone,
            String name,
            User.Role role
    ) {

        return userRepository.findByPhone(phone)
                .orElseGet(() -> {
                    User user = new User();
                    user.setPhone(phone);
                    user.setName(name);
                    user.setPassword(
                            passwordEncoder.encode("Demo1234")
                    );
                    user.setRole(role);
                    user.setActive(true);
                    user.setMustChangePassword(false);
                    return userRepository.save(user);
                });
    }

    private void createRequest(
            RentalRequestRepository repository,
            User tenant,
            Listing listing,
            String code,
            RentalRequest.RequestType type,
            RentalRequest.RequestStatus status,
            LocalDate desiredDate,
            LocalDateTime appointmentAt,
            String rejectReason
    ) {

        RentalRequest request = new RentalRequest();
        request.setCode(code);
        request.setTenant(tenant);
        request.setListing(listing);
        request.setType(type);
        request.setDesiredDate(desiredDate);
        request.setPeopleCount(1);
        request.setMessage(
                type == RentalRequest.RequestType.VIEW
                        ? "Muốn hẹn xem phòng vào cuối tuần"
                        : "Muốn thuê luôn trong tháng này"
        );
        request.setStatus(status);
        request.setAppointmentAt(appointmentAt);
        request.setRejectReason(rejectReason);
        request.setCreatedAt(LocalDateTime.now().minusHours(3));
        request.setUpdatedAt(LocalDateTime.now().minusHours(3));
        repository.save(request);
    }

    private String yearMonth() {
        return String.format(
                "%04d%02d",
                LocalDate.now().getYear(),
                LocalDate.now().getMonthValue()
        );
    }
}
