import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import { execSync } from 'child_process';

const token = '8874598803:AAH8QcmGdBdrsNDRqMzkmqYZxiRh1Tbvn_s';
const allowedUsers = ['7719686382', '1869587326'];
const bot = new TelegramBot(token, { polling: true });

function readTasks() {
  try {
    const data = fs.readFileSync('tasks.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveTasks(tasks, commitMessage) {
  fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2), 'utf8');
  try {
    execSync('git config user.name "TasksBot"');
    execSync('git config user.email "bot@github.com"');
    execSync('git add tasks.json');
    execSync(`git commit -m "${commitMessage}"`);
    execSync('git push');
    return true;
  } catch (e) {
    console.error('Git Push Error:', e.message);
    return false;
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || '').trim();

  if (!allowedUsers.includes(chatId)) {
    return bot.sendMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت.');
  }

  if (text === '/start' || text === 'اوامر' || text === '/help') {
    const help = `👋 أهلاً بك في نظام إدارة الواجبات!

📌 للإضافة:
إضافة / المادة / النوع / التاريخ (YYYY-MM-DD) / ملاحظة
مثال:
إضافة / تعلم اله / واجب / 2026-10-25 / حل تمرين 2

📌 لإنهاء مهمة:
منجز [رقم المهمة]

📌 لعرض المهام:
عرض`;
    return bot.sendMessage(chatId, help);
  }

  if (text.startsWith('إضافة') || text.startsWith('اضافة')) {
    const parts = text.split('/').map(p => p.trim());
    if (parts.length < 4) {
      return bot.sendMessage(chatId, '⚠️ الصيغة غير مكتملة!\nاستخدم: إضافة / المادة / النوع / التاريخ / ملاحظة');
    }

    const subject = parts[1];
    const type = parts[2];
    const dueDate = parts[3];
    const note = parts[4] || 'بدون ملاحظات';

    const tasks = readTasks();
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id || 0)) + 1 : 1;

    tasks.push({
      id: newId,
      subject: subject,
      type: type,
      dueDate: dueDate,
      note: note,
      status: 'قيد الانجاز'
    });

    saveTasks(tasks, `إضافة مهمة #${newId}`);
    return bot.sendMessage(chatId, `✅ تم إضافة المهمة بنجاح برقم: #${newId}`);
  }

  if (text.startsWith('منجز')) {
    const id = parseInt(text.replace('منجز', '').trim());
    if (isNaN(id)) {
      return bot.sendMessage(chatId, '⚠️ يرجى تحديد رقم المهمة. مثال: منجز 1');
    }

    const tasks = readTasks();
    const task = tasks.find(t => t.id === id);

    if (!task) {
      return bot.sendMessage(chatId, `❌ لم يتم العثور على مهمة برقم ${id}`);
    }

    task.status = 'منجز';
    saveTasks(tasks, `تحديث حالة المهمة #${id} إلى منجز`);
    return bot.sendMessage(chatId, `✅ أصبحت المهمة #${id} (${task.subject}) بحالة: منجز!`);
  }

  if (text === 'عرض') {
    const tasks = readTasks();
    if (tasks.length === 0) {
      return bot.sendMessage(chatId, 'القائمة فارغة تماماً.');
    }

    let listMsg = '📋 قائمة المهام:\n\n';
    tasks.forEach(t => {
      const mark = t.status === 'منجز' ? '✅' : '⏳';
      listMsg += `${mark} [#${t.id}] ${t.subject} (${t.type})\n📅 التسليم: ${t.dueDate}\nالحالة: ${t.status}\n\n`;
    });
    return bot.sendMessage(chatId, listMsg);
  }
});

console.log('Bot is running directly on GitHub...');
