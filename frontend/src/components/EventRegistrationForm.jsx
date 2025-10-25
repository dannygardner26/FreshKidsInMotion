import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

const EventRegistrationForm = ({ event, onSuccess, onCancel }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [existingRegistrations, setExistingRegistrations] = useState([]);
  const [formData, setFormData] = useState({
    emergencyContact: '',
    needsFood: false,
    additionalNotes: '',
    confirmDropoffPickup: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  useEffect(() => {
    fetchChildren();
    fetchExistingRegistrations();
  }, []);

  const fetchChildren = async () => {
    try {
      setIsLoadingChildren(true);
      const childrenData = await apiService.getChildren();
      setChildren(childrenData);
    } catch (error) {
      console.error('Error fetching children:', error);
      setError('Failed to load your children. Please try refreshing the page.');
    } finally {
      setIsLoadingChildren(false);
    }
  };

  const fetchExistingRegistrations = async () => {
    try {
      const registrations = await apiService.getMyRegistrations();
      const eventRegistrations = registrations.filter(reg =>
        (reg.event?.id || reg.eventId) === event.id
      );
      setExistingRegistrations(eventRegistrations);
    } catch (error) {
      console.error('Error fetching existing registrations:', error);
      // Don't show an error for this as it's not critical
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleChildSelection = (childId) => {
    setSelectedChildren(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (selectedChildren.length === 0) {
      setError('Please select at least one child to register for this event.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.confirmDropoffPickup) {
      setError('Please confirm that you can dropoff and pickup your child(ren) at the scheduled times.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Process each selected child - handle existing registrations
      const registrationPromises = selectedChildren.map(async (childId) => {
        const child = children.find(c => c.id === childId);

        // Check if child is already registered for this event
        const existingRegistration = existingRegistrations.find(reg =>
          reg.childName === (child.fullName || `${child.firstName} ${child.lastName}`) ||
          reg.childName === `${child.firstName} ${child.lastName}`
        );

        // If child is already registered, cancel the existing registration first
        if (existingRegistration) {
          try {
            await apiService.cancelRegistration(existingRegistration.id);
          } catch (cancelError) {
            console.warn('Could not cancel existing registration:', cancelError);
            // Continue anyway, the backend might handle duplicates
          }
        }

        // Create new registration data
        const registrationData = {
          eventId: event.id,
          childName: child.fullName || `${child.firstName} ${child.lastName}`,
          childAge: child.age,
          allergies: child.foodAllergies || null,
          emergencyContact: formData.emergencyContact || null,
          needsFood: formData.needsFood,
          medicalConcerns: child.medicalConcerns || null,
          additionalInformation: [
            child.baseballExperience ? `Baseball Experience: ${child.baseballExperience}` : '',
            child.additionalInformation || '',
            formData.additionalNotes || ''
          ].filter(Boolean).join('\n') || null
        };

        return apiService.registerForEvent(registrationData);
      });

      await Promise.all(registrationPromises);

      const childrenNames = selectedChildren.map(childId => {
        const child = children.find(c => c.id === childId);
        return child.firstName;
      }).join(', ');

      // Check if any children were already registered
      const hasExistingRegistrations = selectedChildren.some(childId => {
        const child = children.find(c => c.id === childId);
        return existingRegistrations.find(reg =>
          reg.childName === (child.fullName || `${child.firstName} ${child.lastName}`) ||
          reg.childName === `${child.firstName} ${child.lastName}`
        );
      });

      const successMessage = hasExistingRegistrations
        ? `Registration updated! ${childrenNames} ${selectedChildren.length === 1 ? 'has' : 'have'} been registered for this event.`
        : `Registration successful! ${childrenNames} ${selectedChildren.length === 1 ? 'has' : 'have'} been registered for this event.`;

      onSuccess(successMessage);
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-form">
      <div className="card">
        <div className="card-header">
          <h3>Register for {event.name}</h3>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger mb-4">
              {error}
            </div>
          )}

          <div className="event-summary mb-4">
            <h4>Event Details</h4>
            <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
            {event.location && <p><strong>Location:</strong> {event.location}</p>}
            {event.ageGroup && <p><strong>Age Group:</strong> {event.ageGroup}</p>}
            {event.price && <p><strong>Price:</strong> ${event.price}</p>}
            {event.capacity && (
              <p><strong>Capacity:</strong> {event.capacity} participants</p>
            )}
          </div>

          {isLoadingChildren ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your children...</p>
            </div>
          ) : children.length === 0 ? (
            <div className="no-children-state">
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                <strong>No Children Found</strong>
              </div>
              <p>You need to add your children's information before you can register for events.</p>
              <Link to="/dashboard" className="btn btn-primary">
                <i className="fas fa-arrow-left mr-2"></i>
                Go to Dashboard to Add Children
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Select Children to Register *</label>
                <p className="help-text">Select which children you'd like to register for this event. Click on a child card to select them.</p>
                <div className="children-selection">
                  {children.map(child => {
                    const isAlreadyRegistered = existingRegistrations.find(reg =>
                      reg.childName === (child.fullName || `${child.firstName} ${child.lastName}`) ||
                      reg.childName === `${child.firstName} ${child.lastName}`
                    );

                    return (
                      <div key={child.id} className={`child-selection-card ${isAlreadyRegistered ? 'already-registered' : ''}`}>
                        <label className="child-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedChildren.includes(child.id)}
                            onChange={() => handleChildSelection(child.id)}
                          />
                          <span className="checkmark"></span>
                          <div className="child-info">
                            <div className="child-header">
                              <h4>{child.firstName} {child.lastName}</h4>
                              {isAlreadyRegistered && (
                                <span className="registration-status">
                                  <i className="fas fa-check-circle mr-1"></i>
                                  Already Registered
                                </span>
                              )}
                            </div>
                          <div className="child-details">
                            <span className="detail-item">
                              <i className="fas fa-birthday-cake mr-1"></i>
                              {child.age} years old
                            </span>
                            {child.grade && (
                              <span className="detail-item">
                                <i className="fas fa-graduation-cap mr-1"></i>
                                {child.grade}
                              </span>
                            )}
                          </div>
                          {(child.medicalConcerns || child.foodAllergies) && (
                            <div className="health-info">
                              {child.medicalConcerns && (
                                <div className="health-item medical">
                                  <i className="fas fa-heart mr-1"></i>
                                  <strong>Medical:</strong> {child.medicalConcerns}
                                </div>
                              )}
                              {child.foodAllergies && (
                                <div className="health-item allergies">
                                  <i className="fas fa-exclamation-circle mr-1"></i>
                                  <strong>Allergies:</strong> {child.foodAllergies}
                                </div>
                              )}
                            </div>
                          )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="emergencyContact">Emergency Contact</label>
                <input
                  type="text"
                  id="emergencyContact"
                  name="emergencyContact"
                  className="form-control"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  placeholder="Emergency contact name and phone number"
                />
              </div>

              <div className="info-note">
                <div className="alert alert-info">
                  <i className="fas fa-info-circle mr-2"></i>
                  <strong>Note:</strong> We will use your account contact information to communicate with you about this event registration.
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="additionalNotes">Additional Notes</label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  className="form-control"
                  rows="3"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  placeholder="Any additional information for this event registration..."
                />
              </div>

              <div className="form-group">
                <div className="checkbox-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="needsFood"
                      checked={formData.needsFood}
                      onChange={handleInputChange}
                    />
                    <span className="custom-checkbox"></span>
                    <strong>Children would like to receive free food</strong>
                    <small className="d-block text-muted mt-1">
                      We typically provide free pizza, popsicles, or other snacks during events.
                      Check this box if your children would like to participate in the food program.
                    </small>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <div className="checkbox-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="confirmDropoffPickup"
                      checked={formData.confirmDropoffPickup}
                      onChange={handleInputChange}
                    />
                    <span className="custom-checkbox"></span>
                    <strong>I confirm that I can drop off and pick up my child(ren) at the scheduled event times *</strong>
                    <small className="d-block text-muted mt-1">
                      Please ensure you are available for both drop-off and pick-up at the times specified for this event.
                    </small>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline mr-3"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || selectedChildren.length === 0}
                >
                  {isSubmitting ? 'Registering...' : `Register ${selectedChildren.length === 1 ? 'Child' : 'Children'}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .registration-form {
          max-width: 600px;
          margin: 0 auto;
        }

        .event-summary {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid var(--primary);
        }

        .event-summary h4 {
          margin-bottom: 0.75rem;
          color: var(--primary);
        }

        .event-summary p {
          margin-bottom: 0.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .loading-container {
          text-align: center;
          padding: 3rem;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(47, 80, 106, 0.3);
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 1s ease-in-out infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .no-children-state {
          text-align: center;
          padding: 2rem;
        }

        .children-selection {
          display: grid;
          gap: 1rem;
          margin-top: 1rem;
        }

        .child-selection-card {
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.3s ease;
          background: white;
        }

        .child-selection-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .child-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          cursor: pointer;
          margin: 0;
        }

        .child-checkbox input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          width: 0;
          height: 0;
        }

        .child-checkbox .checkmark {
          position: relative;
          height: 24px;
          width: 24px;
          background-color: #fff;
          border: 2px solid #ced4da;
          border-radius: 4px;
          transition: all 0.3s ease;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .child-checkbox input:checked ~ .checkmark {
          background-color: var(--primary);
          border-color: var(--primary);
        }

        .child-checkbox .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          left: 8px;
          top: 4px;
          width: 6px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .child-checkbox input:checked ~ .checkmark:after {
          display: block;
        }

        .child-info {
          flex: 1;
        }

        .child-info h4 {
          margin: 0 0 0.5rem 0;
          color: var(--primary);
          font-size: 1.2rem;
        }

        .child-details {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .detail-item {
          display: flex;
          align-items: center;
          color: #6c757d;
          font-size: 0.9rem;
        }

        .health-info {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e9ecef;
        }

        .health-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .health-item.medical {
          color: #dc3545;
        }

        .health-item.allergies {
          color: #fd7e14;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--text);
        }

        .help-text {
          color: #6c757d;
          font-size: 0.9rem;
          margin: 0.5rem 0 1rem 0;
          font-style: italic;
        }

        .info-note {
          margin: 1.5rem 0;
        }

        .alert-info {
          background-color: #d1ecf1;
          border: 1px solid #bee5eb;
          color: #0c5460;
          padding: 1rem;
          border-radius: 4px;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .form-control {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-control:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(47, 80, 106, 0.1);
        }

        textarea.form-control {
          resize: vertical;
          min-height: 100px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
          position: relative;
          z-index: 10;
        }

        .form-actions .btn {
          pointer-events: auto;
          cursor: pointer;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          min-width: 140px;
          border: 2px solid transparent;
        }

        .form-actions .btn-primary {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(47, 80, 106, 0.2);
        }

        .form-actions .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(47, 80, 106, 0.3);
          background: linear-gradient(135deg, var(--primary-light), var(--primary));
        }

        .form-actions .btn-outline {
          background: white;
          color: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 2px 8px rgba(47, 80, 106, 0.1);
        }

        .form-actions .btn-outline:hover:not(:disabled) {
          background: var(--primary);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(47, 80, 106, 0.2);
        }

        .form-actions .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .alert {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .alert-danger {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .checkbox-option {
          margin: 1rem 0;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
          margin: 0;
          padding: 0.75rem;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          transition: all 0.3s ease;
          background: white;
          width: 100%;
          box-sizing: border-box;
        }

        .checkbox-label:hover {
          border-color: var(--primary);
          background-color: #f8f9fa;
        }

        .checkbox-label input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          width: 0;
          height: 0;
        }

        .custom-checkbox {
          position: relative;
          min-height: 20px;
          min-width: 20px;
          height: 20px;
          width: 20px;
          background-color: #fff;
          border: 2px solid #ced4da;
          border-radius: 4px;
          transition: all 0.3s ease;
          flex-shrink: 0;
          margin-top: 2px;
          display: inline-block;
          box-sizing: border-box;
        }

        .checkbox-label input:checked ~ .custom-checkbox {
          background-color: var(--primary);
          border-color: var(--primary);
        }

        .custom-checkbox:after {
          content: "";
          position: absolute;
          display: none;
          left: 6px;
          top: 2px;
          width: 6px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .checkbox-label input:checked ~ .custom-checkbox:after {
          display: block;
        }

        .child-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .registration-status {
          background-color: #d4edda;
          color: #155724;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          margin-left: 1rem;
        }

        .child-selection-card.already-registered {
          background-color: #f8f9fa;
          border-color: #28a745;
        }

        .child-selection-card.already-registered:hover {
          border-color: #20c997;
          background-color: #f0fff4;
        }

        .mr-3 {
          margin-right: 1rem;
        }

        @media (max-width: 768px) {
          .form-actions {
            flex-direction: column;
          }

          .form-actions .btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }

          .child-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .registration-status {
            margin-left: 0;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EventRegistrationForm;