package com.example.restservice;

import com.example.restservice.model.Role;
import com.example.restservice.model.Role.ERole;
import com.example.restservice.model.User;
import com.example.restservice.repository.RoleRepository;
import com.example.restservice.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.HashSet;
import java.util.Set;

@SpringBootApplication
public class RestServiceApplication {

    private static final Logger log = LoggerFactory.getLogger(RestServiceApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(RestServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner initDatabase(RoleRepository roleRepository, UserRepository userRepository) {
        return args -> {
            log.info("Initializing database with default team roles...");

            // Create default team roles if they don't exist
            if (roleRepository.findByName(ERole.TEAM_FUNDRAISING).isEmpty()) {
                roleRepository.save(new Role(ERole.TEAM_FUNDRAISING));
                log.info("Created TEAM_FUNDRAISING");
            }

            if (roleRepository.findByName(ERole.TEAM_SOCIAL_MEDIA).isEmpty()) {
                roleRepository.save(new Role(ERole.TEAM_SOCIAL_MEDIA));
                log.info("Created TEAM_SOCIAL_MEDIA");
            }

            if (roleRepository.findByName(ERole.TEAM_COACH).isEmpty()) {
                roleRepository.save(new Role(ERole.TEAM_COACH));
                log.info("Created TEAM_COACH");
            }

            if (roleRepository.findByName(ERole.TEAM_EVENT_COORDINATION).isEmpty()) {
                roleRepository.save(new Role(ERole.TEAM_EVENT_COORDINATION));
                log.info("Created TEAM_EVENT_COORDINATION");
            }

            log.info("Database initialization completed");
        };
    }
}
