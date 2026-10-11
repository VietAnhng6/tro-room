
package com.troroom.backend.dto;

public class ContractRenewalRequest {

    private Integer termMonths;
    private Long rent;

    public ContractRenewalRequest() {
    }

    public Integer getTermMonths() {
        return termMonths;
    }

    public void setTermMonths(Integer termMonths) {
        this.termMonths = termMonths;
    }

    public Long getRent() {
        return rent;
    }

    public void setRent(Long rent) {
        this.rent = rent;
    }
}