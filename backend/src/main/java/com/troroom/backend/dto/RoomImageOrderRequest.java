package com.troroom.backend.dto;

import java.util.List;

public class RoomImageOrderRequest {

    private List<Long> imageIds;

    public List<Long> getImageIds() {
        return imageIds;
    }

    public void setImageIds(List<Long> imageIds) {
        this.imageIds = imageIds;
    }
}