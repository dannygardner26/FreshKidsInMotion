package com.example.restservice;

import com.example.restservice.model.Event;
import com.example.restservice.model.Participant;
import com.example.restservice.model.User;
import com.example.restservice.payload.response.MessageResponse;
import com.example.restservice.repository.EventRepository;
import com.example.restservice.repository.ParticipantRepository;
import com.example.restservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600) // Allow all origins for now
@RestController
@RequestMapping("/api/participants")
public class ParticipantController {

    @Autowired
    private ParticipantRepository participantRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    // Fetch registrations for the currently logged-in user
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUserRegistrations(HttpServletRequest request) {
        try {
            String firebaseUid = (String) request.getAttribute("firebaseUid");
            
            if (firebaseUid == null) {
                return ResponseEntity.status(401)
                    .body(new MessageResponse("Error: User not authenticated"));
            }

            User currentUser = userRepository.findByFirebaseUid(firebaseUid)
                    .orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(404)
                    .body(new MessageResponse("Error: User not found in database"));
            }

            List<Participant> participants = participantRepository.findByParentUser(currentUser);

            // Convert to DTO format expected by frontend
            List<RegistrationResponseDTO> registrations = participants.stream()
                .map(participant -> {
                    RegistrationResponseDTO dto = new RegistrationResponseDTO();
                    dto.setId(participant.getId());

                    // Split childName into first and last name
                    String[] nameParts = participant.getChildName().split(" ", 2);
                    dto.setChildFirstName(nameParts[0]);
                    dto.setChildLastName(nameParts.length > 1 ? nameParts[1] : "");

                    dto.setRegistrationDate(participant.getRegistrationDate());
                    dto.setStatus(participant.getStatus());
                    dto.setChildAge(participant.getChildAge());
                    dto.setAllergies(participant.getAllergies());
                    dto.setEmergencyContact(participant.getEmergencyContact());
                    dto.setNeedsFood(participant.getNeedsFood());

                    // Create event DTO
                    if (participant.getEvent() != null) {
                        EventResponseDTO eventDto = new EventResponseDTO();
                        eventDto.setId(participant.getEvent().getId());
                        eventDto.setTitle(participant.getEvent().getName()); // name -> title
                        eventDto.setStartDate(participant.getEvent().getDate()); // date -> startDate
                        eventDto.setEndDate(participant.getEvent().getDate()); // same day for endDate
                        eventDto.setDescription(participant.getEvent().getDescription());
                        eventDto.setLocation(participant.getEvent().getLocation());
                        eventDto.setCapacity(participant.getEvent().getCapacity());
                        eventDto.setAgeGroup(participant.getEvent().getAgeGroup());
                        eventDto.setPrice(participant.getEvent().getPrice());
                        dto.setEvent(eventDto);
                    }

                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());

            return ResponseEntity.ok(registrations);
            
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new MessageResponse("Error: Failed to get registrations - " + e.getMessage()));
        }
    }

    // Register for an event
    @PostMapping
    public ResponseEntity<?> registerForEvent(@Valid @RequestBody RegisterEventRequest request, 
                                            HttpServletRequest httpRequest) {
        try {
            String firebaseUid = (String) httpRequest.getAttribute("firebaseUid");
            
            if (firebaseUid == null) {
                return ResponseEntity.status(401)
                    .body(new MessageResponse("Error: User not authenticated"));
            }

            User currentUser = userRepository.findByFirebaseUid(firebaseUid)
                    .orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(404)
                    .body(new MessageResponse("Error: User not found in database"));
            }

            Event event = eventRepository.findById(request.getEventId())
                    .orElse(null);

            if (event == null) {
                return ResponseEntity.status(404)
                    .body(new MessageResponse("Error: Event not found"));
            }

            // Check if already registered
            List<Participant> existingRegistrations = participantRepository
                .findByParentUserAndEvent(currentUser, event);
            
            if (!existingRegistrations.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: Child already registered for this event"));
            }

            // Check capacity if set
            if (event.getCapacity() != null) {
                long currentRegistrations = participantRepository.countByEvent(event);
                if (currentRegistrations >= event.getCapacity()) {
                    return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Event is at full capacity"));
                }
            }

            Participant participant = new Participant(request.getChildName(), currentUser, event);
            
            // Set additional fields
            if (request.getChildAge() != null) {
                participant.setChildAge(request.getChildAge());
            }
            if (request.getAllergies() != null) {
                participant.setAllergies(request.getAllergies());
            }
            if (request.getEmergencyContact() != null) {
                participant.setEmergencyContact(request.getEmergencyContact());
            }
            if (request.getNeedsFood() != null) {
                participant.setNeedsFood(request.getNeedsFood());
            }
            if (request.getMedicalConcerns() != null) {
                participant.setMedicalConcerns(request.getMedicalConcerns());
            }
            if (request.getAdditionalInformation() != null) {
                participant.setAdditionalInformation(request.getAdditionalInformation());
            }

            Participant savedParticipant = participantRepository.save(participant);
            return ResponseEntity.ok(savedParticipant);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Error: Failed to register for event - " + e.getMessage()));
        }
    }

    // Cancel registration
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelRegistration(@PathVariable Long id, 
                                              HttpServletRequest request) {
        try {
            String firebaseUid = (String) request.getAttribute("firebaseUid");
            
            if (firebaseUid == null) {
                return ResponseEntity.status(401)
                    .body(new MessageResponse("Error: User not authenticated"));
            }

            User currentUser = userRepository.findByFirebaseUid(firebaseUid)
                    .orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(404)
                    .body(new MessageResponse("Error: User not found in database"));
            }

            Optional<Participant> participantOpt = participantRepository.findById(id);
            if (!participantOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }

            Participant participant = participantOpt.get();
            
            // Check if the participant belongs to the current user
            if (!participant.getParentUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403)
                    .body(new MessageResponse("Error: You can only cancel your own registrations"));
            }

            // Check if event hasn't started yet
            if (participant.getEvent().getDate().isBefore(LocalDate.now())) {
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: Cannot cancel registration for past events"));
            }

            participantRepository.delete(participant);
            return ResponseEntity.ok(new MessageResponse("Registration cancelled successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Error: Failed to cancel registration - " + e.getMessage()));
        }
    }

    // Get all participants for an event (Admin and Volunteer access)
    @GetMapping("/event/{eventId}")
    public ResponseEntity<?> getEventParticipants(@PathVariable Long eventId, HttpServletRequest request) {
        try {
            String firebaseUid = (String) request.getAttribute("firebaseUid");

            if (firebaseUid == null) {
                return ResponseEntity.status(401)
                    .body(new MessageResponse("Error: User not authenticated"));
            }

            User currentUser = userRepository.findByFirebaseUid(firebaseUid)
                    .orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(404)
                    .body(new MessageResponse("Error: User not found"));
            }

            // Check if user is admin or volunteer
            if (currentUser.getUserType() != User.UserType.ADMIN) {
                return ResponseEntity.status(403)
                    .body(new MessageResponse("Error: Access denied. Admin privileges required."));
            }

            Event event = eventRepository.findById(eventId)
                    .orElse(null);

            if (event == null) {
                return ResponseEntity.status(404)
                    .body(new MessageResponse("Error: Event not found"));
            }

            List<Participant> participants = participantRepository.findByEvent(event);

            // Convert to DTO format to avoid Hibernate serialization issues
            List<RegistrationResponseDTO> participantDTOs = participants.stream()
                .map(participant -> {
                    RegistrationResponseDTO dto = new RegistrationResponseDTO();
                    dto.setId(participant.getId());

                    // Split childName into first and last name
                    String[] nameParts = participant.getChildName().split(" ", 2);
                    dto.setChildFirstName(nameParts[0]);
                    dto.setChildLastName(nameParts.length > 1 ? nameParts[1] : "");

                    dto.setRegistrationDate(participant.getRegistrationDate());
                    dto.setStatus(participant.getStatus());
                    dto.setChildAge(participant.getChildAge());
                    dto.setAllergies(participant.getAllergies());
                    dto.setEmergencyContact(participant.getEmergencyContact());
                    dto.setNeedsFood(participant.getNeedsFood());

                    // Create event DTO
                    if (participant.getEvent() != null) {
                        EventResponseDTO eventDto = new EventResponseDTO();
                        eventDto.setId(participant.getEvent().getId());
                        eventDto.setTitle(participant.getEvent().getName()); // name -> title
                        eventDto.setStartDate(participant.getEvent().getDate()); // date -> startDate
                        eventDto.setEndDate(participant.getEvent().getDate()); // same day for endDate
                        eventDto.setDescription(participant.getEvent().getDescription());
                        eventDto.setLocation(participant.getEvent().getLocation());
                        eventDto.setCapacity(participant.getEvent().getCapacity());
                        eventDto.setAgeGroup(participant.getEvent().getAgeGroup());
                        eventDto.setPrice(participant.getEvent().getPrice());
                        dto.setEvent(eventDto);
                    }

                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());

            return ResponseEntity.ok(participantDTOs);
            
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new MessageResponse("Error: Failed to get participants - " + e.getMessage()));
        }
    }

    // Request class for event registration
    public static class RegisterEventRequest {
        private Long eventId;
        private String childName;
        private Integer childAge;
        private String allergies;
        private String emergencyContact;
        private Boolean needsFood;
        private String medicalConcerns;
        private String additionalInformation;

        // Getters and setters
        public Long getEventId() { return eventId; }
        public void setEventId(Long eventId) { this.eventId = eventId; }

        public String getChildName() { return childName; }
        public void setChildName(String childName) { this.childName = childName; }

        public Integer getChildAge() { return childAge; }
        public void setChildAge(Integer childAge) { this.childAge = childAge; }

        public String getAllergies() { return allergies; }
        public void setAllergies(String allergies) { this.allergies = allergies; }

        public String getEmergencyContact() { return emergencyContact; }
        public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

        public Boolean getNeedsFood() { return needsFood; }
        public void setNeedsFood(Boolean needsFood) { this.needsFood = needsFood; }

        public String getMedicalConcerns() { return medicalConcerns; }
        public void setMedicalConcerns(String medicalConcerns) { this.medicalConcerns = medicalConcerns; }

        public String getAdditionalInformation() { return additionalInformation; }
        public void setAdditionalInformation(String additionalInformation) { this.additionalInformation = additionalInformation; }
    }

    // DTO for registration responses
    public static class RegistrationResponseDTO {
        private Long id;
        private String childFirstName;
        private String childLastName;
        private java.time.LocalDate registrationDate;
        private Participant.RegistrationStatus status;
        private Integer childAge;
        private String allergies;
        private String emergencyContact;
        private Boolean needsFood;
        private EventResponseDTO event;

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getChildFirstName() { return childFirstName; }
        public void setChildFirstName(String childFirstName) { this.childFirstName = childFirstName; }

        public String getChildLastName() { return childLastName; }
        public void setChildLastName(String childLastName) { this.childLastName = childLastName; }

        public java.time.LocalDate getRegistrationDate() { return registrationDate; }
        public void setRegistrationDate(java.time.LocalDate registrationDate) { this.registrationDate = registrationDate; }

        public Participant.RegistrationStatus getStatus() { return status; }
        public void setStatus(Participant.RegistrationStatus status) { this.status = status; }

        public Integer getChildAge() { return childAge; }
        public void setChildAge(Integer childAge) { this.childAge = childAge; }

        public String getAllergies() { return allergies; }
        public void setAllergies(String allergies) { this.allergies = allergies; }

        public String getEmergencyContact() { return emergencyContact; }
        public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

        public Boolean getNeedsFood() { return needsFood; }
        public void setNeedsFood(Boolean needsFood) { this.needsFood = needsFood; }

        public EventResponseDTO getEvent() { return event; }
        public void setEvent(EventResponseDTO event) { this.event = event; }
    }

    // DTO for event responses
    public static class EventResponseDTO {
        private Long id;
        private String title;
        private java.time.LocalDate startDate;
        private java.time.LocalDate endDate;
        private String description;
        private String location;
        private Integer capacity;
        private String ageGroup;
        private Double price;

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public java.time.LocalDate getStartDate() { return startDate; }
        public void setStartDate(java.time.LocalDate startDate) { this.startDate = startDate; }

        public java.time.LocalDate getEndDate() { return endDate; }
        public void setEndDate(java.time.LocalDate endDate) { this.endDate = endDate; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public Integer getCapacity() { return capacity; }
        public void setCapacity(Integer capacity) { this.capacity = capacity; }

        public String getAgeGroup() { return ageGroup; }
        public void setAgeGroup(String ageGroup) { this.ageGroup = ageGroup; }

        public Double getPrice() { return price; }
        public void setPrice(Double price) { this.price = price; }
    }
}