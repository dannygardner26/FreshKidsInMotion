import React, { useState } from 'react';
import { apiService } from '../services/api';

const VolunteerSignupForm = ({ event, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    notes: '',
    backgroundCheck: false,
    previousVolunteer: false,
    previousVolunteerDetails: '',
    canAttendFullTime: false,
    communicationPreferences: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCommunicationPreferenceChange = (preference) => {
    setFormData(prev => ({
      ...prev,
      communicationPreferences: prev.communicationPreferences.includes(preference)
        ? prev.communicationPreferences.filter(p => p !== preference)
        : [...prev.communicationPreferences, preference]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const volunteerData = {
        eventId: event.id,
        role: 'Event Volunteer', // Default role since we removed role selection
        availability: formData.canAttendFullTime ? 'Full event duration' : null,
        skills: null, // Removed skills section
        notes: [
          formData.notes || '',
          formData.communicationPreferences.length > 0 ? `Contact via: ${formData.communicationPreferences.join(', ')}` : '',
          formData.backgroundCheck ? 'Background check completed/willing' : '',
          formData.previousVolunteer ? 'Previous Kids in Motion volunteer' : '',
          formData.previousVolunteerDetails ? `Previous experience: ${formData.previousVolunteerDetails}` : ''
        ].filter(Boolean).join('\n') || null
      };

      await apiService.volunteerForEvent(volunteerData);
      onSuccess('Volunteer signup successful! Thank you for volunteering for this event.');
    } catch (error) {
      console.error('Volunteer signup failed:', error);
      setError(error.message || 'Volunteer signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="volunteer-form">
      <div className="card volunteer-signup-card">
        <div className="card-header volunteer-header">
          <h3>Volunteer Sign-up</h3>
          <h4 className="event-name">{event.name}</h4>
          <p className="volunteer-welcome">
            Thank you for your interest in volunteering! Your time and energy help make these events possible.
          </p>
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
            <p><strong>Description:</strong> {event.description}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group attendance-question">
              <div className="attendance-card">
                <h4>Event Attendance Confirmation</h4>
                <p>
                  <strong>Event Duration:</strong> {event.startTime && event.endTime
                    ? `${event.startTime} to ${event.endTime}`
                    : 'Full event duration'} on {new Date(event.date).toLocaleDateString()}
                </p>
                <label className="checkbox-label attendance-checkbox">
                  <input
                    type="checkbox"
                    name="canAttendFullTime"
                    checked={formData.canAttendFullTime}
                    onChange={handleInputChange}
                    required
                  />
                  <span className="checkmark"></span>
                  <strong>Yes, I can attend the event from start to end</strong>
                </label>
                <small className="form-text">
                  We need volunteers who can commit to the full event duration to ensure consistent support.
                </small>
              </div>
            </div>

            <div className="form-group">
              <div className="volunteer-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="backgroundCheck"
                    checked={formData.backgroundCheck}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  I have completed or am willing to complete a background check if required
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="previousVolunteer"
                    checked={formData.previousVolunteer}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  I have previously volunteered with Kids in Motion
                </label>
              </div>

              {formData.previousVolunteer && (
                <div className="previous-volunteer-details">
                  <label htmlFor="previousVolunteerDetails">Please describe your previous volunteer experience with Kids in Motion:</label>
                  <textarea
                    id="previousVolunteerDetails"
                    name="previousVolunteerDetails"
                    className="form-control"
                    rows="3"
                    value={formData.previousVolunteerDetails}
                    onChange={handleInputChange}
                    placeholder="Describe your previous roles, events you helped with, any training you received, etc."
                    required={formData.previousVolunteer}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>How would you like to be contacted? (Select all that apply)</label>
              <div className="communication-preferences">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.communicationPreferences.includes('email')}
                    onChange={() => handleCommunicationPreferenceChange('email')}
                  />
                  <span className="checkmark"></span>
                  Email
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.communicationPreferences.includes('sms')}
                    onChange={() => handleCommunicationPreferenceChange('sms')}
                  />
                  <span className="checkmark"></span>
                  SMS/Text Messages
                </label>
              </div>
              <small className="form-text">
                Please select at least one method so we can keep you updated about the event. Website messages are included automatically.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information or special requirements"
              />
            </div>

            <div className="volunteer-commitment">
              <h5>Volunteer Commitment & Expectations</h5>
              <div className="commitment-content">
                <div className="row">
                  <div className="col-md-6">
                    <h6>What We Expect:</h6>
                    <ul>
                      <li>Arrive 15 minutes before your scheduled time</li>
                      <li>Stay for your full volunteer commitment</li>
                      <li>Follow all safety protocols and guidelines</li>
                      <li>Maintain a positive, encouraging attitude</li>
                      <li>Respect all participants and fellow volunteers</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>What You Get:</h6>
                    <ul>
                      <li>Make a meaningful impact in children's lives</li>
                      <li>Community service hours (if needed)</li>
                      <li>Experience working with youth sports</li>
                      <li>Connect with like-minded volunteers</li>
                      <li>Free event t-shirt (for regular volunteers)</li>
                    </ul>
                  </div>
                </div>
                <div className="cancellation-policy">
                  <small className="text-muted">
                    <strong>Cancellation Policy:</strong> Please contact us at least 48 hours in advance if you need to cancel.
                    We understand emergencies happen - just let us know as soon as possible!
                  </small>
                </div>
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
                className="btn btn-secondary"
                disabled={isSubmitting || !formData.canAttendFullTime || formData.communicationPreferences.length === 0}
              >
                {isSubmitting ? 'Signing Up...' : 'Sign Up as Volunteer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .volunteer-form {
          max-width: 700px;
          margin: 0 auto;
          padding: 1rem;
        }

        .volunteer-signup-card {
          border: none;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }

        .volunteer-header {
          background: var(--primary);
          color: white;
          padding: 2rem;
          text-align: center;
        }

        .volunteer-header h3 {
          margin: 0 0 1rem 0;
          font-size: 1.8rem;
          font-weight: 700;
        }

        .volunteer-header .event-name {
          margin: 0 0 1rem 0;
          font-size: 1.4rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .volunteer-welcome {
          margin: 0;
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.5;
        }

        .event-summary {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid var(--secondary);
        }

        .event-summary h4 {
          margin-bottom: 0.75rem;
          color: var(--secondary);
        }

        .event-summary p {
          margin-bottom: 0.5rem;
        }

        .attendance-question {
          margin-bottom: 2rem;
        }

        .attendance-card {
          background: #f8f9fa;
          border: 2px solid var(--primary);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
        }

        .attendance-card h4 {
          color: var(--primary);
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }

        .attendance-card p {
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          color: #495057;
        }

        .attendance-checkbox {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: 1.1rem;
          margin-bottom: 0.75rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .attendance-checkbox input[type="checkbox"] {
          position: relative;
          width: 20px;
          height: 20px;
          margin: 0;
        }

        .volunteer-commitment {
          background-color: #e8f4f8;
          padding: 1rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }

        .volunteer-commitment h5 {
          color: var(--secondary);
          margin-bottom: 1rem;
        }

        .volunteer-commitment ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .volunteer-commitment li {
          margin-bottom: 0.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--text);
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
          border-color: var(--secondary);
          box-shadow: 0 0 0 2px rgba(231, 110, 90, 0.1);
        }

        select.form-control {
          background-color: white;
        }

        textarea.form-control {
          resize: vertical;
          min-height: 100px;
        }

        .form-text {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.875rem;
          color: #6c757d;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 2rem;
          padding: 1.5rem 0 0 0;
          border-top: 1px solid #eee;
        }

        .btn {
          padding: 0.75rem 2rem;
          border-radius: 6px;
          border: 2px solid;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
          text-align: center;
          min-width: 120px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-outline {
          background: white;
          color: var(--primary);
          border-color: var(--primary);
        }

        .btn-outline:hover:not(:disabled) {
          background: var(--primary);
          color: white;
        }

        .btn-secondary {
          background: var(--secondary);
          color: white;
          border-color: var(--secondary);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--secondary-light);
          border-color: var(--secondary-light);
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

        .mr-3 {
          margin-right: 1rem;
        }

        .communication-preferences {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        /* Custom Checkbox Styles */
        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
          margin-bottom: 1rem;
          position: relative;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }

        .checkbox-label:hover {
          background-color: rgba(47, 80, 106, 0.05);
        }

        .checkbox-label input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          width: 0;
          height: 0;
        }

        .checkmark {
          position: relative;
          height: 22px;
          width: 22px;
          background-color: #fff;
          border: 2px solid #ced4da;
          border-radius: 4px;
          transition: all 0.3s ease;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .checkbox-label:hover .checkmark {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(47, 80, 106, 0.1);
        }

        .checkbox-label input:checked ~ .checkmark {
          background-color: var(--primary);
          border-color: var(--primary);
        }

        .checkbox-label input:focus ~ .checkmark {
          box-shadow: 0 0 0 3px rgba(47, 80, 106, 0.2);
        }

        .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          left: 7px;
          top: 3px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .checkbox-label input:checked ~ .checkmark:after {
          display: block;
        }

        .checkbox-label span:not(.checkmark) {
          line-height: 1.5;
          color: var(--text);
          font-weight: 500;
        }

        .volunteer-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .previous-volunteer-details {
          margin-top: 1rem;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid var(--secondary);
        }

        .previous-volunteer-details label {
          color: var(--secondary);
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .previous-volunteer-details textarea {
          background-color: white;
          border: 1px solid #ddd;
        }

        .previous-volunteer-details textarea:focus {
          border-color: var(--secondary);
          box-shadow: 0 0 0 2px rgba(231, 110, 90, 0.1);
        }

        .communication-preferences .checkbox-label {
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          transition: all 0.3s ease;
        }

        .communication-preferences .checkbox-label:hover {
          background-color: rgba(47, 80, 106, 0.08);
          border-color: var(--primary);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .communication-preferences .checkbox-label input:checked ~ .checkmark {
          background-color: var(--secondary);
          border-color: var(--secondary);
        }

        @media (max-width: 768px) {
          .form-actions {
            flex-direction: column;
          }

          .form-actions .btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }

          .volunteer-form {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default VolunteerSignupForm;