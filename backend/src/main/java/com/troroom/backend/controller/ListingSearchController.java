package com.troroom.backend.controller;

import com.troroom.backend.dto.ListingSearchResponse;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.Room;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.ListingSpecification;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public/listings")
public class ListingSearchController {

    private final ListingRepository listingRepository;

    public ListingSearchController(
            ListingRepository listingRepository
    ) {
        this.listingRepository = listingRepository;
    }

    @GetMapping("/search")
    public Map<String, Object> searchListings(

            @RequestParam(required = false) String district,

            @RequestParam(required = false) Long minRent,

            @RequestParam(required = false) Long maxRent,

            @RequestParam(required = false) Double minArea,

            @RequestParam(required = false) Double maxArea,

            @RequestParam(required = false) Integer maxPeople,

            @RequestParam(defaultValue = "newest") String sort,

            @RequestParam(defaultValue = "0") int page
    ) {

        Specification<Listing> specification =
                ListingSpecification.publishedAndNotExpired();

        if (district != null && !district.isBlank()) {
            specification = specification.and(
                    ListingSpecification.districtEquals(
                            district.trim()
                    )
            );
        }

        if (minRent != null) {
            specification = specification.and(
                    ListingSpecification.rentGreaterThanOrEqual(
                            minRent
                    )
            );
        }

        if (maxRent != null) {
            specification = specification.and(
                    ListingSpecification.rentLessThanOrEqual(
                            maxRent
                    )
            );
        }

        if (minArea != null) {
            specification = specification.and(
                    ListingSpecification.areaGreaterThanOrEqual(
                            minArea
                    )
            );
        }

        if (maxArea != null) {
            specification = specification.and(
                    ListingSpecification.areaLessThanOrEqual(
                            maxArea
                    )
            );
        }

        if (maxPeople != null) {
            specification = specification.and(
                    ListingSpecification.maxPeopleGreaterThanOrEqual(
                            maxPeople
                    )
            );
        }

        Sort sorting;

        switch (sort.toLowerCase()) {

            case "price_asc":
                sorting = Sort.by(
                        Sort.Direction.ASC,
                        "room.rent"
                );
                break;

            case "price_desc":
                sorting = Sort.by(
                        Sort.Direction.DESC,
                        "room.rent"
                );
                break;

            case "newest":
            default:
                sorting = Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                );
                break;
        }

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                12,
                sorting
        );

        Page<Listing> result =
                listingRepository.findAll(
                        specification,
                        pageable
                );

        var content = result.getContent()
                .stream()
                .map(this::toResponse)
                .toList();

        Map<String, Object> response = new HashMap<>();

        response.put("content", content);
        response.put("page", result.getNumber());
        response.put("size", result.getSize());
        response.put("totalElements", result.getTotalElements());
        response.put("totalPages", result.getTotalPages());
        response.put("first", result.isFirst());
        response.put("last", result.isLast());

        return response;
    }

    private ListingSearchResponse toResponse(Listing listing) {

        Room room = listing.getRoom();

        return new ListingSearchResponse(
                listing.getId(),
                listing.getTitle(),
                listing.getDescription(),
                listing.getCreatedAt(),
                listing.getExpiresAt(),

                room.getId(),
                room.getCode(),
                room.getFloor(),
                room.getArea(),
                room.getRent(),
                room.getMaxPeople(),

                room.getBuilding().getId(),
                room.getBuilding().getName(),
                room.getBuilding().getAddress(),
                room.getBuilding().getAddress()
        );
    }
}