package com.troroom.backend.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("staging")
public class DemoSeedRunner {

    @Bean
    @ConditionalOnProperty(name = "demo.seed.enabled", havingValue = "true")
    CommandLineRunner runDemoSeed(
            DemoSeedService baseSeed,
            DemoInvoiceSeedService invoiceSeed
    ) {
        return args -> {
            baseSeed.seed();
            invoiceSeed.seed();
        };
    }
}