import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../core/models/models.dart';
import '../../widgets/app_widgets.dart';
import 'employee_support.dart';
import 'employee_widgets.dart';

class EmployeeScheduleScreen extends StatefulWidget {
  const EmployeeScheduleScreen({super.key});

  @override
  State<EmployeeScheduleScreen> createState() => _EmployeeScheduleScreenState();
}

class _EmployeeScheduleScreenState extends State<EmployeeScheduleScreen> {
  late DateTime _month;
  Future<_EmployeeScheduleBundle>? _future;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = DateTime(now.year, now.month);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  String get _monthKey => '${_month.year.toString().padLeft(4, '0')}-${_month.month.toString().padLeft(2, '0')}';

  String get _fromDate => '${_month.year.toString().padLeft(4, '0')}-${_month.month.toString().padLeft(2, '0')}-01';

  String get _toDate {
    final nextMonth = DateTime(_month.year, _month.month + 1);
    final lastDay = nextMonth.subtract(const Duration(days: 1));
    return '${lastDay.year.toString().padLeft(4, '0')}-${lastDay.month.toString().padLeft(2, '0')}-${lastDay.day.toString().padLeft(2, '0')}';
  }

  Future<_EmployeeScheduleBundle> _load() async {
    final controller = AppScope.of(context);
    final values = await Future.wait<dynamic>([
      controller.loadEmployeeTodaySchedule(),
      controller.loadEmployeeTodayAttendance(),
      controller.loadEmployeeMonthlySchedule(_monthKey),
      controller.loadEmployeeAttendanceHistory(
        fromDate: _fromDate,
        toDate: _toDate,
        page: 0,
        size: 20,
      ),
    ]);
    return _EmployeeScheduleBundle(
      todaySchedule: values[0] as JsonMap?,
      todayAttendance: values[1] as JsonMap?,
      monthlySchedule: values[2] as JsonMap,
      attendanceHistory: (values[3] as AdminListResult).items,
    );
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future;
  }

  Future<void> _shiftMonth(int delta) async {
    setState(() {
      _month = DateTime(_month.year, _month.month + delta);
      _future = _load();
    });
    await _future;
  }

  Future<void> _checkIn() async {
    try {
      await AppScope.of(context).employeeCheckIn();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-in thanh cong.')),
      );
      await _refresh();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _checkOut() async {
    try {
      await AppScope.of(context).employeeCheckOut();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-out thanh cong.')),
      );
      await _refresh();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Schedule & attendance')),
      body: FutureBuilder<_EmployeeScheduleBundle>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: ErrorStateCard(
                message: snapshot.error.toString(),
                onRetry: _refresh,
              ),
            );
          }

          final data = snapshot.data!;
          final attendance = data.todayAttendance;
          final monthlyItems = employeeMonthlyItems(data.monthlySchedule);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                if (data.todaySchedule != null)
                  EmployeeScheduleSummaryCard(
                    title: 'Ca hom nay',
                    schedule: data.todaySchedule!,
                  )
                else
                  const EmptyStateCard(
                    title: 'Hom nay chua co lich',
                    message: 'Khi manager hoac admin xep lich, chi tiet ca se hien tai day.',
                  ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cham cong hom nay',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        if (attendance == null)
                          const Text('Chua co ban ghi attendance hom nay.')
                        else ...[
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              MetricChip(
                                label: asBool(attendance['checkedIn']) ? 'Da check-in' : 'Chua check-in',
                              ),
                              MetricChip(
                                label: asBool(attendance['checkedOut']) ? 'Da check-out' : 'Chua check-out',
                              ),
                              if (asString(attendance['checkInAt']).isNotEmpty)
                                MetricChip(label: 'In ${asString(attendance['checkInAt'])}'),
                              if (asString(attendance['checkOutAt']).isNotEmpty)
                                MetricChip(label: 'Out ${asString(attendance['checkOutAt'])}'),
                            ],
                          ),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: attendance != null && !asBool(attendance['checkedIn']) ? _checkIn : null,
                                child: const Text('Check in'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton(
                                onPressed: attendance != null &&
                                        asBool(attendance['checkedIn']) &&
                                        !asBool(attendance['checkedOut'])
                                    ? _checkOut
                                    : null,
                                child: const Text('Check out'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: 'Lich thang $_monthKey',
                  subtitle: 'Vuot de xem nhanh cac ca sap toi va da qua.',
                  actionLabel: 'Tai lai',
                  onTap: _refresh,
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        OutlinedButton(
                          onPressed: () => _shiftMonth(-1),
                          child: const Text('Thang truoc'),
                        ),
                        const Spacer(),
                        Text(
                          _monthKey,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const Spacer(),
                        OutlinedButton(
                          onPressed: () => _shiftMonth(1),
                          child: const Text('Thang sau'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (monthlyItems.isEmpty)
                  const EmptyStateCard(
                    title: 'Thang nay chua co lich',
                    message: 'Khi backend co monthly schedule, danh sach ca se hien o day.',
                  )
                else
                  ...monthlyItems.take(12).map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EmployeeScheduleSummaryCard(
                        title: 'Ca ${asString(item['workDate'])}',
                        schedule: item,
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                const SectionHeader(
                  title: 'Lich su attendance',
                  subtitle: 'Giup doi chieu nhanh trong thang dang xem.',
                ),
                const SizedBox(height: 12),
                if (data.attendanceHistory.isEmpty)
                  const EmptyStateCard(
                    title: 'Chua co lich su attendance',
                    message: 'Sau khi co ban ghi check-in/check-out, lich su se hien tai day.',
                  )
                else
                  ...data.attendanceHistory.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          title: Text(
                            '${asString(item['workDate'])} • ${asString(item['storeName'])}',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              '${asString(item['scheduledStartTime'])} - ${asString(item['scheduledEndTime'])}\n${asBool(item['checkedOut']) ? 'Da checkout' : 'Chua checkout'}',
                            ),
                          ),
                          isThreeLine: true,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _EmployeeScheduleBundle {
  const _EmployeeScheduleBundle({
    required this.todaySchedule,
    required this.todayAttendance,
    required this.monthlySchedule,
    required this.attendanceHistory,
  });

  final JsonMap? todaySchedule;
  final JsonMap? todayAttendance;
  final JsonMap monthlySchedule;
  final List<JsonMap> attendanceHistory;
}
