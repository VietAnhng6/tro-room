package com.troroom.backend.demo;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RentalRequestRepository;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@Profile("staging")
public class DemoSeedService {

    private final UserRepository users;
    private final BuildingRepository buildings;
    private final RoomRepository rooms;
    private final ListingRepository listings;
    private final RentalRequestRepository requests;
    private final RentalContractRepository contracts;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoSeedService(
            UserRepository users,
            BuildingRepository buildings,
            RoomRepository rooms,
            ListingRepository listings,
            RentalRequestRepository requests,
            RentalContractRepository contracts,
            PasswordEncoder passwordEncoder,
            @Value("${demo.password}") String demoPassword
    ) {
        this.users = users;
        this.buildings = buildings;
        this.rooms = rooms;
        this.listings = listings;
        this.requests = requests;
        this.contracts = contracts;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    @Transactional
    public void seed() {
        createUser("admin@demo.local", "0900000001",
                "Admin Demo", User.Role.ADMIN);

        User landlord = createUser("landlord@demo.local", "0900000002",
                "Chủ nhà Demo", User.Role.LANDLORD);

        User manager = createUser("manager@demo.local", "0900000003",
                "Quản lý Demo", User.Role.MANAGER);

        for (int i = 1; i <= 20; i++) {
            createUser(
                    String.format("tenant%02d@demo.local", i),
                    String.format("091000%04d", i),
                    "Khách thuê Demo " + i,
                    User.Role.TENANT
            );
        }

        for (int buildingNumber = 1; buildingNumber <= 2; buildingNumber++) {
            Building building = createBuilding(
                    "Tòa Demo " + buildingNumber, landlord, manager
            );

            for (int roomNumber = 1; roomNumber <= 15; roomNumber++) {
                Room room = createRoom(building, roomNumber);
                boolean rented = roomNumber <= 10;
                Listing listing = createListing(room, rented);

                if (rented) {
                    int tenantNumber =
                            (buildingNumber - 1) * 10 + roomNumber;

                    User tenant = users.findByEmail(
                            String.format("tenant%02d@demo.local", tenantNumber)
                    ).orElseThrow();

                    createContract(
                            buildingNumber, roomNumber,
                            room, listing, tenant
                    );
                }
            }
        }
    }

    private User createUser(
            String email, String phone, String name, User.Role role
    ) {
        return users.findByEmail(email).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setPhone(phone);
            user.setName(name);
            user.setRole(role);
            user.setActive(true);
            user.setPassword(passwordEncoder.encode(demoPassword));
            return users.save(user);
        });
    }

    private Building createBuilding(
            String name, User landlord, User manager
    ) {
        return buildings.findByLandlord(landlord).stream()
                .filter(b -> name.equals(b.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Building building = new Building();
                    building.setName(name);
                    building.setAddress("Địa chỉ mẫu của " + name);
                    building.setDistrict("Quận Demo");
                    building.setFloors(3);
                    building.setLandlord(landlord);
                    building.setManager(manager);
                    building.setActive(true);
                    return buildings.save(building);
                });
    }

    private Room createRoom(Building building, int number) {
        String code = String.format("P%03d", 100 + number);

        return rooms.findByBuildingAndCode(building, code)
                .orElseGet(() -> {
                    Room room = new Room();
                    room.setBuilding(building);
                    room.setCode(code);
                    room.setFloor((number - 1) / 5 + 1);
                    room.setArea(24.0);
                    room.setMaxPeople(2);
                    room.setRent(3_000_000L + number * 100_000L);
                    room.setStatus(Room.Status.EMPTY);
                    return rooms.save(room);
                });
    }

    private Listing createListing(Room room, boolean rented) {
        return listings.findAllByRoom(room).stream()
                .findFirst()
                .orElseGet(() -> {
                    Listing listing = new Listing();
                    listing.setRoom(room);
                    listing.setTitle("Cho thuê " + room.getCode());
                    listing.setDescription("Tin đăng dữ liệu mẫu S4-10");
                    listing.setStatus(
                            rented
                                    ? Listing.Status.RENTED
                                    : Listing.Status.PUBLISHED
                    );
                    listing.setCreatedAt(
                            LocalDateTime.now().minusMonths(7)
                    );
                    listing.setExpiresAt(
                            LocalDateTime.now().plusMonths(1)
                    );
                    return listings.save(listing);
                });
    }

    private void createContract(
            int buildingNumber,
            int roomNumber,
            Room room,
            Listing listing,
            User tenant
    ) {
        if (!contracts.findByRoomOrderByStartDateDesc(room).isEmpty()) {
            return;
        }

        LocalDate startDate =
                LocalDate.now().minusMonths(6).withDayOfMonth(1);

        RentalRequest request = new RentalRequest();
        request.setRequestCode(String.format(
                "REQ-S410-%02d-%02d", buildingNumber, roomNumber
        ));
        request.setListing(listing);
        request.setTenant(tenant);
        request.setType(RentalRequest.Type.RENT_NOW);
        request.setDesiredDate(startDate);
        request.setExpectedPeople(1);
        request.setStatus(RentalRequest.Status.ACCEPTED);
        request.setCreatedAt(
                LocalDateTime.now().minusMonths(6)
        );
        request = requests.save(request);

        RentalContract contract = new RentalContract();
        contract.setContractCode(String.format(
                "HD-S410-%02d-%02d", buildingNumber, roomNumber
        ));
        contract.setRequest(request);
        contract.setTenant(tenant);
        contract.setRoom(room);
        contract.setRent(room.getRent());
        contract.setDeposit(room.getRent());
        contract.setStartDate(startDate);
        contract.setTermMonths(12);
        contract.setEndDate(startDate.plusMonths(12).minusDays(1));
        contract.setBillingCutoffDay(5);
        contract.setInitialElectricity(0);
        contract.setInitialWater(0);
        contract.setCreatedAt(LocalDateTime.now().minusMonths(6));
        contract.setStatus(RentalContract.Status.ACTIVE);
        contracts.save(contract);

        room.setStatus(Room.Status.RENTED);
        rooms.save(room);
    }
}