import InvoicePreviewModal from "../components/InvoicePreviewModal";
import { formatCurrencyVnd } from "../lib/locale";
import { useEmployeePageState } from "../hooks/useEmployeePageState";
import { ui } from "../ui";
import { EmployeeHeaderSection } from "../components/employee/employee-header-section";
import { EmployeeNotificationsPanel } from "../components/employee/employee-notifications-panel";
import { EmployeeOrdersPanel } from "../components/employee/employee-orders-panel";
import { EmployeeOrderDetailPanel } from "../components/employee/employee-order-detail-panel";
import { getEmployeeOrderAction } from "../lib/employee-order-actions";

export default function EmployeePage() {
  const s = useEmployeePageState();

  return (
    <main className={`${ui.page} density-compact py-8`}>
      <EmployeeHeaderSection
        user={s.auth.user}
        employeeRole={s.employeeRole}
        stats={s.stats}
        unreadCount={s.unreadNotifications}
        formatPrice={formatCurrencyVnd}
      />

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        {/* Left column */}
        <div className="grid gap-6">
          <EmployeeNotificationsPanel
            notifications={s.notifications}
            loading={s.notificationsLoading}
            error={s.notificationsError}
            notice={s.notificationNotice}
            onOpen={s.handleNotificationOpen}
            onReadToggle={s.handleNotificationReadToggle}
            onReadAll={s.handleReadAllNotifications}
          />

          <EmployeeOrdersPanel
            employeeRole={s.employeeRole}
            feed={s.ordersFeed}
            loading={s.ordersLoading}
            error={s.ordersError}
            notice={s.taskNotice}
            taskMode={s.taskMode}
            searchInput={s.searchInput}
            actionLoadingId={s.actionLoadingId}
            storeName={s.auth.user?.workingStoreName}
            onTaskModeChange={s.setTaskMode}
            onSearchChange={s.setSearchInput}
            onSearch={s.handleTaskSearch}
            onOpen={s.handleOpenOrder}
            onAction={s.handleTaskAction}
            onInvoice={s.setInvoicePreviewOrder}
            getTaskAction={(o) => getEmployeeOrderAction(o, s.employeeRole)}
          />
        </div>

        {/* Right column */}
        <div className="grid content-start gap-6">
          <EmployeeOrderDetailPanel
            orderDetail={s.orderDetail}
            loading={s.detailLoading}
            error={s.detailError}
            detailAction={s.detailAction}
            actionLoadingId={s.actionLoadingId}
            canUploadDeliveryProof={s.canUploadDeliveryProof}
            proofForm={s.proofForm}
            onAction={s.handleTaskAction}
            onInvoice={s.setInvoicePreviewOrder}
            onProofUpload={s.handleDeliveryProofUpload}
            onProofFileChange={s.handleProofFileChange}
            onProofNoteChange={s.setDeliveryProofNote}
            onProofCapturedAtChange={s.setDeliveryProofCapturedAt}
          />
        </div>
      </section>

      <InvoicePreviewModal
        open={Boolean(s.invoicePreviewOrder)}
        order={s.invoicePreviewOrder}
        onClose={() => s.setInvoicePreviewOrder(null)}
      />
    </main>
  );
}
