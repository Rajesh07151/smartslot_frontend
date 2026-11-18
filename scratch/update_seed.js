import fs from 'fs';

let content = fs.readFileSync('../backend/src/seed.js', 'utf8');

const targetStart = '  // 5. Seed Past, Today, and Future Appointments with INR pricing';
const targetEnd = "  console.log('✅ Seeding with Indian Rupee (INR) rates & Auth accounts completed successfully!');";

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers', { startIndex, endIndex });
  process.exit(1);
}

const replacement = `  // 5. Seed Real Customer Appointment (Harsha's live booking)
  const sampleAppointments = [
    {
      id: 'apt-40173698-abfc-4776-b7b3-4a4e4cedd27a',
      booking_reference: 'SLOT-HQ2S',
      user_id: 'usr-d04170a0',
      customer_name: 'Harsha',
      customer_email: 'harsha121@gmail.com',
      customer_phone: '+918074920177',
      service_id: 'srv-align',
      staff_id: 'stf-david',
      date: '2026-11-17',
      start_time: '10:30',
      end_time: '11:30',
      duration_minutes: 60,
      total_price: 1499.00,
      status: 'CONFIRMED',
      vehicle_details: 'AP31DA7607',
      customer_notes: '4-Wheel laser calibration',
      staff_notes: null
    }
  ];

  const insertApt = db.prepare(\`
    INSERT INTO appointments (
      id, booking_reference, user_id, customer_name, customer_email, customer_phone,
      service_id, staff_id, date, start_time, end_time, duration_minutes,
      total_price, status, cancellation_reason, vehicle_details, customer_notes,
      staff_notes, created_at, updated_at
    ) VALUES (
      @id, @booking_reference, @user_id, @customer_name, @customer_email, @customer_phone,
      @service_id, @staff_id, @date, @start_time, @end_time, @duration_minutes,
      @total_price, @status, @cancellation_reason, @vehicle_details, @customer_notes,
      @staff_notes, datetime('now'), datetime('now')
    )
  \`);

  const insertNotification = db.prepare(\`
    INSERT INTO notifications (
      id, appointment_id, booking_reference, recipient_name, recipient_email, recipient_phone,
      type, channel, subject, message, status, sent_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DELIVERED', datetime('now')
    )
  \`);

  for (const apt of sampleAppointments) {
    const dateStr = apt.date;

    insertApt.run({
      id: apt.id,
      booking_reference: apt.booking_reference,
      user_id: apt.user_id,
      customer_name: apt.customer_name,
      customer_email: apt.customer_email,
      customer_phone: apt.customer_phone,
      service_id: apt.service_id,
      staff_id: apt.staff_id,
      date: dateStr,
      start_time: apt.start_time,
      end_time: apt.end_time,
      duration_minutes: apt.duration_minutes,
      total_price: apt.total_price,
      status: apt.status,
      cancellation_reason: null,
      vehicle_details: apt.vehicle_details,
      customer_notes: apt.customer_notes,
      staff_notes: apt.staff_notes || null
    });

    insertNotification.run(
      \`notif-conf-\${apt.id}\`,
      apt.id,
      apt.booking_reference,
      apt.customer_name,
      apt.customer_email,
      apt.customer_phone,
      'CONFIRMATION',
      'EMAIL',
      \`SmartSlot Booking Confirmed: \${apt.booking_reference}\`,
      \`Hi \${apt.customer_name}, your appointment for \${apt.service_id} is confirmed on \${dateStr} at \${apt.start_time}. Total estimated: ₹\${apt.total_price}. Manage or reschedule anytime with reference \${apt.booking_reference}.\`
    );

    insertNotification.run(
      \`notif-sms-\${apt.id}\`,
      apt.id,
      apt.booking_reference,
      apt.customer_name,
      apt.customer_email,
      apt.customer_phone,
      'REMINDER_24H',
      'SMS',
      \`Reminder: SmartSlot Appointment Tomorrow\`,
      \`[SmartSlot] Reminder: Appointment tomorrow at \${apt.start_time} with your service specialist. Reply HELP for directions or visit smartslot.app/manage/\${apt.booking_reference}.\`
    );
  }

`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync('../backend/src/seed.js', content, 'utf8');
console.log('Successfully updated seed.js!');
