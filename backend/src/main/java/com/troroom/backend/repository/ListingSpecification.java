package com.troroom.backend.repository;

import com.troroom.backend.entity.Listing;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.time.LocalDateTime;

public class ListingSpecification {

    private ListingSpecification() {
    }

    public static Specification<Listing> publishedAndNotExpired() {
        return (root, query, cb) -> cb.and(
                cb.equal(
                        root.get("status"),
                        Listing.Status.PUBLISHED
                ),
                cb.greaterThan(
                        root.get("expiresAt"),
                        LocalDateTime.now()
                )
        );
    }

    public static Specification<Listing> districtEquals(
            String district
    ) {
        return (root, query, cb) -> {

            Join<Object, Object> room =
                    root.join("room", JoinType.INNER);

            Join<Object, Object> building =
                    room.join("building", JoinType.INNER);

            return cb.equal(
                    cb.lower(building.get("district")),
                    district.toLowerCase()
            );
        };
    }

    public static Specification<Listing> rentGreaterThanOrEqual(
            Long minRent
    ) {
        return (root, query, cb) -> {

            Join<Object, Object> room =
                    root.join("room", JoinType.INNER);

            return cb.greaterThanOrEqualTo(
                    room.get("rent"),
                    minRent
            );
        };
    }

    public static Specification<Listing> rentLessThanOrEqual(
            Long maxRent
    ) {
        return (root, query, cb) -> {

            Join<Object, Object> room =
                    root.join("room", JoinType.INNER);

            return cb.lessThanOrEqualTo(
                    room.get("rent"),
                    maxRent
            );
        };
    }

    public static Specification<Listing> areaGreaterThanOrEqual(
            Double minArea
    ) {
        return (root, query, cb) -> {

            Join<Object, Object> room =
                    root.join("room", JoinType.INNER);

            return cb.greaterThanOrEqualTo(
                    room.get("area"),
                    minArea
            );
        };
    }

    public static Specification<Listing> areaLessThanOrEqual(
            Double maxArea
    ) {
        return (root, query, cb) -> {

            Join<Object, Object> room =
                    root.join("room", JoinType.INNER);

            return cb.lessThanOrEqualTo(
                    room.get("area"),
                    maxArea
            );
        };
    }

    public static Specification<Listing> maxPeopleGreaterThanOrEqual(
            Integer maxPeople
    ) {
        return (root, query, cb) -> {

            Join<Object, Object> room =
                    root.join("room", JoinType.INNER);

            return cb.greaterThanOrEqualTo(
                    room.get("maxPeople"),
                    maxPeople
            );
        };
    }
}