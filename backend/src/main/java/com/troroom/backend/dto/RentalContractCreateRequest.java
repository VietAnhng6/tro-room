package com.troroom.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class RentalContractCreateRequest {

    @NotNull
    private Long requestId;

    @Min(0)
    private long deposit;

    @NotNull
    private LocalDate startDate;

    @Min(1)
    private int termMonths;

    @Min(1)
    private int billingCutoffDay;

    @Min(0)
    private Integer initialElectricity;

    @Min(0)
    private Integer initialWater;

    public RentalContractCreateRequest() {
    }

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public long getDeposit() {
        return deposit;
    }

    public void setDeposit(long deposit) {
        this.deposit = deposit;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public int getTermMonths() {
        return termMonths;
    }

    public void setTermMonths(int termMonths) {
        this.termMonths = termMonths;
    }

    public int getBillingCutoffDay() {
        return billingCutoffDay;
    }

    public void setBillingCutoffDay(int billingCutoffDay) {
        this.billingCutoffDay = billingCutoffDay;
    }

    public Integer getInitialElectricity() {
        return initialElectricity;
    }

    public void setInitialElectricity(Integer initialElectricity) {
        this.initialElectricity = initialElectricity;
    }

    public Integer getInitialWater() {
        return initialWater;
    }

    public void setInitialWater(Integer initialWater) {
        this.initialWater = initialWater;
    }
}