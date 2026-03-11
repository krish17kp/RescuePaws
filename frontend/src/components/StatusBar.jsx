const STATUS_LABELS = {
  pending: 'Waiting for Responder',
  assigned: 'Responder Assigned',
  in_progress: 'Help is Arriving',
  resolved: 'Case Resolved',
  cancelled: 'Case Cancelled',
};

export default function StatusBar({ status, detail }) {
  return (
    <div className="status-bar">
      <span className={`status-dot ${status}`} />
      <span className="status-text">{STATUS_LABELS[status] || status}</span>
      {detail && <span className="status-detail">{detail}</span>}
    </div>
  );
}
