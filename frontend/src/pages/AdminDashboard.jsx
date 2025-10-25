import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import AdminMessaging from '../components/AdminMessaging';
import UsersAndRegistrations from '../components/UsersAndRegistrations';
import ReportsAndAnalytics from '../components/ReportsAndAnalytics';

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [eventStats, setEventStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'events');
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingEventData, setEditingEventData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchEvents();

    // Auto-refresh events every 30 seconds
    const interval = setInterval(() => {
      console.log('Auto-refreshing admin events...');
      fetchEvents();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const eventsData = await apiService.getEvents();
      console.log('Admin dashboard fetched events:', eventsData);
      setEvents(eventsData);

      // Fetch statistics for each event
      const statsPromises = eventsData.map(async (event) => {
        try {
          const participants = await apiService.getEventParticipants(event.id);
          // TODO: Add volunteer count when volunteer API is available
          return {
            eventId: event.id,
            registrationCount: participants.length,
            registrations: participants,
            volunteerCount: 0, // Placeholder - will implement when volunteer API is ready
            volunteers: [],
            revenue: participants.reduce((total, p) => total + (event.price || 0), 0),
            capacity: event.capacity,
            isFullyBooked: event.capacity && participants.length >= event.capacity,
            attendanceRate: 0, // Can be calculated post-event
          };
        } catch (err) {
          console.warn(`Failed to fetch stats for event ${event.id}:`, err);
          return {
            eventId: event.id,
            registrationCount: 0,
            registrations: [],
            volunteerCount: 0,
            volunteers: [],
            revenue: 0,
            capacity: event.capacity,
            isFullyBooked: false,
            attendanceRate: 0,
          };
        }
      });

      const allStats = await Promise.all(statsPromises);
      const statsMap = {};
      allStats.forEach(stat => {
        statsMap[stat.eventId] = stat;
      });
      setEventStats(statsMap);

    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteEvent(eventId);
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event: ' + error.message);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setEditingEventData({
      name: event.name,
      date: new Date(event.date).toISOString().slice(0, 16), // Format for datetime-local input
      location: event.location || '',
      description: event.description || '',
      ageGroup: event.ageGroup || '',
      capacity: event.capacity || '',
      price: event.price || 0
    });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditingEventData({});
  };

  const handleSaveEvent = async () => {
    if (!editingEventId) return;

    try {
      setIsUpdating(true);

      // Convert the data to the format expected by the API
      const updateData = {
        ...editingEventData,
        date: new Date(editingEventData.date).toISOString(),
        capacity: editingEventData.capacity ? parseInt(editingEventData.capacity) : null,
        price: parseFloat(editingEventData.price) || 0
      };

      await apiService.updateEvent(editingEventId, updateData);

      // Update the local events state
      setEvents(events.map(event =>
        event.id === editingEventId
          ? { ...event, ...updateData }
          : event
      ));

      setEditingEventId(null);
      setEditingEventData({});
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditingEventData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  // Check if user is admin
  const isAdmin = userProfile?.userType === 'ADMIN';

  if (!isAdmin) {
    return (
      <>
        <div className="container mt-4">
          <div className="card">
            <div className="card-body text-center">
              <h2>Access Denied</h2>
              <p>You don't have permission to access the admin dashboard.</p>
              <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <div className="container mt-4">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading admin dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container mt-4">
        <div className="admin-header mb-4">
          <h1>Admin Dashboard</h1>
          <p>Manage events, users, and system settings</p>
        </div>

        <div className="admin-tabs mb-4">
          <button 
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'messaging' ? 'active' : ''}`}
            onClick={() => setActiveTab('messaging')}
          >
            Announcements
          </button>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </div>

        {activeTab === 'events' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Events Management</h2>
              <Link to="/admin/events/new" className="btn btn-primary">
                <i className="fas fa-plus mr-2"></i>Create New Event
              </Link>
            </div>

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <div className="events-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Registration Stats</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => {
                    const stats = eventStats[event.id] || {};
                    const registrationCount = stats.registrationCount || 0;
                    const capacity = event.capacity;
                    const isUpcoming = new Date(event.date) > new Date();
                    const revenue = stats.revenue || 0;

                    const isEditing = editingEventId === event.id;

                    return (
                      <tr key={event.id}>
                        <td>
                          {isEditing ? (
                            <div className="edit-field">
                              <input
                                type="text"
                                value={editingEventData.name}
                                onChange={(e) => handleEditFieldChange('name', e.target.value)}
                                className="form-control form-control-sm"
                                placeholder="Event name"
                              />
                              <input
                                type="text"
                                value={editingEventData.ageGroup}
                                onChange={(e) => handleEditFieldChange('ageGroup', e.target.value)}
                                className="form-control form-control-sm mt-1"
                                placeholder="Age group"
                              />
                            </div>
                          ) : (
                            <>
                              <strong>{event.name}</strong>
                              {event.ageGroup && (
                                <div className="text-muted small">{event.ageGroup}</div>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="datetime-local"
                              value={editingEventData.date}
                              onChange={(e) => handleEditFieldChange('date', e.target.value)}
                              className="form-control form-control-sm"
                            />
                          ) : (
                            <>
                              <div>{new Date(event.date).toLocaleDateString()}</div>
                              <div className={`small ${isUpcoming ? 'text-success' : 'text-muted'}`}>
                                {isUpcoming ? 'Upcoming' : 'Past'}
                              </div>
                            </>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingEventData.location}
                              onChange={(e) => handleEditFieldChange('location', e.target.value)}
                              className="form-control form-control-sm"
                              placeholder="Location"
                            />
                          ) : (
                            event.location || 'TBD'
                          )}
                        </td>
                        <td>
                          <div className="stats-cell">
                            <div className="stat-item">
                              <strong>{registrationCount}</strong>
                              <span className="small"> registrations</span>
                            </div>
                            {capacity && (
                              <div className="small text-muted">
                                {registrationCount}/{capacity} capacity
                                <div className="capacity-bar">
                                  <div
                                    className="capacity-fill"
                                    style={{
                                      width: `${Math.min((registrationCount / capacity) * 100, 100)}%`,
                                      backgroundColor: registrationCount >= capacity ? '#dc3545' : '#28a745'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            {!capacity && (
                              <div className="small text-muted">Unlimited capacity</div>
                            )}
                          </div>
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="edit-field">
                              <input
                                type="number"
                                value={editingEventData.price}
                                onChange={(e) => handleEditFieldChange('price', e.target.value)}
                                className="form-control form-control-sm"
                                placeholder="Price"
                                min="0"
                                step="0.01"
                              />
                              <input
                                type="number"
                                value={editingEventData.capacity}
                                onChange={(e) => handleEditFieldChange('capacity', e.target.value)}
                                className="form-control form-control-sm mt-1"
                                placeholder="Capacity"
                                min="1"
                              />
                            </div>
                          ) : (
                            <div className="revenue-cell">
                              {event.price > 0 ? (
                                <>
                                  <strong>${revenue.toFixed(2)}</strong>
                                  <div className="small text-muted">${event.price} each</div>
                                </>
                              ) : (
                                <span className="text-success">Free Event</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="status-cell">
                            {isUpcoming ? (
                              <>
                                {stats.isFullyBooked ? (
                                  <span className="status-badge fully-booked">Fully Booked</span>
                                ) : capacity && registrationCount >= capacity * 0.8 ? (
                                  <span className="status-badge nearly-full">Nearly Full</span>
                                ) : (
                                  <span className="status-badge open">Open</span>
                                )}
                              </>
                            ) : (
                              <span className="status-badge completed">Completed</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={handleSaveEvent}
                                  className="btn btn-sm btn-success"
                                  title="Save changes"
                                  disabled={isUpdating}
                                >
                                  <i className="fas fa-check mr-1"></i>
                                  {isUpdating ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="btn btn-sm btn-secondary"
                                  title="Cancel editing"
                                  disabled={isUpdating}
                                >
                                  <i className="fas fa-times mr-1"></i>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditEvent(event)}
                                  className="btn btn-sm btn-warning"
                                  title="Edit event"
                                >
                                  <i className="fas fa-edit mr-1"></i>
                                  Edit
                                </button>
                                <Link
                                  to={`/admin/events/${event.id}/overview`}
                                  className="btn btn-sm btn-primary"
                                  title="View complete event overview"
                                >
                                  <i className="fas fa-eye mr-1"></i>
                                  Overview
                                </Link>
                                <button
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="btn btn-sm btn-danger"
                                  title="Delete event"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {events.length === 0 && (
                <div className="text-center py-4">
                  <p>No events found.</p>
                  <Link to="/admin/events/new" className="btn btn-primary">
                    Create Your First Event
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}


        {activeTab === 'messaging' && (
          <div className="admin-section">
            <AdminMessaging />
          </div>
        )}


        {activeTab === 'users' && (
          <div className="admin-section">
            <UsersAndRegistrations />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="admin-section">
            <ReportsAndAnalytics />
          </div>
        )}
      </div>

      <style>{`
        .admin-header {
          text-align: center;
          padding: 2rem 0;
          border-bottom: 1px solid #eee;
        }

        .admin-tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .tab-btn {
          padding: 0.75rem 1.5rem;
          border: 2px solid var(--primary);
          background: white;
          color: var(--primary);
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
        }

        .tab-btn:hover {
          background: var(--primary);
          color: white;
        }

        .tab-btn.active {
          background: var(--primary);
          color: white;
        }

        .admin-section {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          min-height: 600px;
          margin-bottom: 3rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .section-header h2 {
          margin: 0;
        }

        .events-table {
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .table th,
        .table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: var(--text);
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-sm {
          padding: 0.25rem 0.75rem;
          font-size: 0.875rem;
        }

        .coming-soon {
          text-align: center;
          padding: 4rem 2rem;
          color: #6c757d;
        }

        .coming-soon h3 {
          margin-bottom: 1rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(47, 80, 106, 0.3);
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 1s ease-in-out infinite;
          margin-bottom: 1rem;
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

        .mr-2 {
          margin-right: 0.5rem;
        }

        /* Enhanced Event Statistics Styles */
        .stats-cell {
          min-width: 140px;
        }

        .stat-item {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 4px;
        }

        .capacity-bar {
          width: 100%;
          height: 4px;
          background-color: #e9ecef;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 2px;
        }

        .capacity-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 2px;
        }

        .revenue-cell {
          min-width: 80px;
        }

        .status-cell {
          min-width: 100px;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.open {
          background-color: #d4edda;
          color: #155724;
        }

        .status-badge.nearly-full {
          background-color: #fff3cd;
          color: #856404;
        }

        .status-badge.fully-booked {
          background-color: #f8d7da;
          color: #721c24;
        }

        .status-badge.completed {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .action-buttons .btn {
          padding: 0.25rem 0.5rem;
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .text-success {
          color: #28a745 !important;
        }

        .text-muted {
          color: #6c757d !important;
        }

        .small {
          font-size: 0.875rem;
        }

        /* Edit Field Styles */
        .edit-field {
          min-width: 150px;
        }

        .edit-field .form-control {
          border: 1px solid #ced4da;
          border-radius: 4px;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .edit-field .form-control:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 0.2rem rgba(47, 80, 106, 0.25);
          outline: 0;
        }

        .edit-field .mt-1 {
          margin-top: 0.25rem;
        }

        .action-buttons .btn-warning {
          background-color: #ffc107;
          border-color: #ffc107;
          color: #212529;
        }

        .action-buttons .btn-warning:hover {
          background-color: #e0a800;
          border-color: #d39e00;
        }

        .action-buttons .btn-success {
          background-color: #28a745;
          border-color: #28a745;
          color: white;
        }

        .action-buttons .btn-success:hover {
          background-color: #218838;
          border-color: #1e7e34;
        }

        .action-buttons .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .admin-tabs {
            flex-direction: column;
          }

          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .action-buttons {
            flex-direction: column;
          }

          .events-table {
            font-size: 0.875rem;
          }

          .table th,
          .table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default AdminDashboard;