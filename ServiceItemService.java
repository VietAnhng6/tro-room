package com.troroom.backend.service;

import com.troroom.backend.entity.Serviceitem;
import com.troroom.backend.entity.ServicePrice;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.Serviceitemrepository;
import com.troroom.backend.repository.Servicepricerepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class ServiceItemService {

    private final Serviceitemrepository serviceItemRepository;
    private final Servicepricerepository servicePriceRepository;

    public ServiceItemService(
            Serviceitemrepository serviceItemRepository,
            Servicepricerepository servicePriceRepository
    ) {
        this.serviceItemRepository = serviceItemRepository;
        this.servicePriceRepository = servicePriceRepository;
    }

    // 5 dịch vụ mặc định khi tạo tài khoản Chủ nhà (S1-09 AC 2). Đơn giá khởi tạo
    // là giá trị gợi ý, chủ nhà sửa lại sau.
    private static final List<Object[]> DEFAULT_SERVICES = List.of(
            new Object[]{"Điện", Serviceitem.CalcMethod.THEO_CHI_SO, "kWh", 3_500L},
            new Object[]{"Nước", Serviceitem.CalcMethod.THEO_CHI_SO, "m3", 15_000L},
            new Object[]{"Rác", Serviceitem.CalcMethod.CO_DINH, "phòng/tháng", 30_000L},
            new Object[]{"Gửi xe", Serviceitem.CalcMethod.THEO_DAU_NGUOI, "người/tháng", 100_000L},
            new Object[]{"Internet", Serviceitem.CalcMethod.CO_DINH, "phòng/tháng", 100_000L}
    );

    public void seedDefaultServices(User landlord) {
        for (Object[] def : DEFAULT_SERVICES) {

            Serviceitem item = new Serviceitem();
            item.setName((String) def[0]);
            item.setCalcMethod((Serviceitem.CalcMethod) def[1]);
            item.setUnit((String) def[2]);
            item.setLandlord(landlord);
            item.setActive(true);
            item.setDefault(true);

            serviceItemRepository.save(item);

            ServicePrice price = new ServicePrice();
            price.setServiceItem(item);
            price.setUnitPrice((Long) def[3]);
            price.setEffectiveFrom(LocalDate.now());

            servicePriceRepository.save(price);
        }
    }

    public ServicePrice getCurrentPrice(Serviceitem item) {
        return servicePriceRepository
                .findFirstByServiceItemAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
                        item, LocalDate.now()
                )
                .orElse(null);
    }

    public Map<String, Object> toResponse(Serviceitem item) {
        ServicePrice current = getCurrentPrice(item);

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("id", item.getId());
        response.put("name", item.getName());
        response.put("calcMethod", item.getCalcMethod().name());
        response.put("unit", item.getUnit());
        response.put("active", item.isActive());
        response.put("isDefault", item.isDefault());
        response.put("currentUnitPrice", current == null ? null : current.getUnitPrice());
        response.put("priceEffectiveFrom", current == null ? null : current.getEffectiveFrom().toString());
        return response;
    }
}