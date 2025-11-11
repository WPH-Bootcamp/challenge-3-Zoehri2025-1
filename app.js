// ============================================
// HABIT TRACKER CLI - CHALLENGE 3
// ============================================
// NAMA: Zoehri
// KELAS: Batch 3
// TANGGAL: 10 November 2025
// ============================================

// ============================================
// MODULE IMPORTS & CONSTANTS
// ============================================
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 10000; // 10 detik
const DAYS_IN_WEEK = 7;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ============================================
// USER PROFILE OBJECT
// ============================================
const userProfile = {
  name: 'Habit Warrior',
  joinDate: new Date(),
  totalHabits: 0,
  completedThisWeek: 0,
  /**
   * Update statistik profil berdasarkan habits yang ada
   * @param {Habit[]} habits
   */
  updateStats(habits = []) {
    const habitList = habits ?? [];
    this.totalHabits = habitList.length;
    this.completedThisWeek = habitList.filter((habit) =>
      habit.isCompletedThisWeek()
    ).length;
  },
  /**
   * Hitung total hari sejak bergabung
   * @returns {number}
   */
  getDaysJoined() {
    const start = this.joinDate ?? new Date();
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return days < 1 ? 1 : days;
  },
};

// ============================================
// HABIT CLASS
// ============================================
class Habit {
  constructor(name, targetFrequency, data = {}) {
    this.id = data.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.name = (name?.trim() ?? '') || 'Kebiasaan Tanpa Nama';
    this.targetFrequency = Number(targetFrequency ?? 7);
    this.completions = (data.completions ?? []).map(
      Habit.normalizeCompletionDate
    );
    this.createdAt = Habit.normalizeDate(data.createdAt);
  }

  static normalizeDate(value) {
    if (!value) {
      return new Date();
    }
    const dateValue = value instanceof Date ? value : new Date(value);
    return Number.isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }

  static normalizeCompletionDate(value) {
    const normalized = Habit.normalizeDate(value);
    return normalized.toISOString();
  }

  static getDateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  getThisWeekCompletions() {
    const now = new Date();
    const startWindow = new Date(now);
    startWindow.setHours(0, 0, 0, 0);
    startWindow.setDate(now.getDate() - (DAYS_IN_WEEK - 1));

    return this.completions.filter((completion) => {
      const date = new Date(completion);
      return date >= startWindow && date <= now;
    });
  }

  isCompletedThisWeek() {
    return this.getThisWeekCompletions().length >= this.targetFrequency;
  }

  markComplete() {
    const today = new Date();
    const todayKey = Habit.getDateKey(today);
    const alreadyCompleted = this.completions.find(
      (completion) => Habit.getDateKey(new Date(completion)) === todayKey
    );
    if (!alreadyCompleted) {
      this.completions.push(today.toISOString());
    }
  }

  getProgressPercentage() {
    if (this.targetFrequency <= 0) {
      return 0;
    }
    const percentage =
      (this.getThisWeekCompletions().length / this.targetFrequency) * 100;
    return Math.round(Math.min(100, percentage));
  }

  getStatus() {
    return this.isCompletedThisWeek() ? 'Selesai' : 'Aktif';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      targetFrequency: this.targetFrequency,
      completions: this.completions,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

// ============================================
// HABIT TRACKER CLASS
// ============================================
class HabitTracker {
  constructor() {
    this.habits = [];
    this.reminderIntervalId = null;
  }

  addHabit(name, frequencyInput) {
    const frequency = Number(frequencyInput ?? 7) || 7;
    const newHabit = new Habit(name, frequency);
    this.habits.push(newHabit);
    this.saveToFile();
    userProfile.updateStats(this.habits);
    console.log(
      `✅ Kebiasaan "${newHabit.name}" berhasil ditambahkan dengan target ${newHabit.targetFrequency}x/minggu.`
    );
  }

  completeHabit(habitIndex) {
    const habit = this.habits[habitIndex - 1] ?? null;
    if (!habit) {
      console.log('⚠️  Indeks kebiasaan tidak valid.');
      return;
    }
    habit.markComplete();
    this.saveToFile();
    userProfile.updateStats(this.habits);
    console.log(
      `🎉 Kebiasaan "${habit.name}" ditandai selesai untuk hari ini.`
    );
  }

  deleteHabit(habitIndex) {
    const habit = this.habits[habitIndex - 1] ?? null;
    if (!habit) {
      console.log('⚠️  Indeks kebiasaan tidak valid.');
      return;
    }
    this.habits.splice(habitIndex - 1, 1);
    this.saveToFile();
    userProfile.updateStats(this.habits);
    console.log(`🗑️  Kebiasaan "${habit.name}" telah dihapus.`);
  }

  displayProfile() {
    userProfile.updateStats(this.habits);
    console.log('==================================================');
    console.log('PROFIL PENGGUNA');
    console.log('==================================================');
    console.log(`Nama           : ${userProfile.name}`);
    console.log(`Tanggal Bergabung : ${userProfile.joinDate.toDateString()}`);
    console.log(`Total Hari Bergabung : ${userProfile.getDaysJoined()} hari`);
    console.log(`Total Kebiasaan : ${userProfile.totalHabits}`);
    console.log(`Selesai Minggu Ini : ${userProfile.completedThisWeek}`);
    console.log('==================================================\n');
  }

  displayHabits(filterOption = 'all') {
    let filteredHabits = [];
    if (filterOption === 'active') {
      filteredHabits = this.habits.filter(
        (habit) => !habit.isCompletedThisWeek()
      );
    } else if (filterOption === 'completed') {
      filteredHabits = this.habits.filter((habit) =>
        habit.isCompletedThisWeek()
      );
    } else {
      filteredHabits = [...this.habits];
    }

    console.log('==================================================');
    const titleMap = {
      all: 'SEMUA KEBIASAAN',
      active: 'KEBIASAAN AKTIF',
      completed: 'KEBIASAAN SELESAI',
    };
    console.log(titleMap[filterOption] ?? titleMap.all);
    console.log('==================================================');

    if (filteredHabits.length === 0) {
      console.log('Belum ada kebiasaan yang cocok dengan filter ini.\n');
      return;
    }

    filteredHabits.forEach((habit, index) => {
      const progress = `${habit.getThisWeekCompletions().length}/${
        habit.targetFrequency
      }`;
      const progressBar = this.generateProgressBar(
        habit.getProgressPercentage()
      );
      console.log(`${index + 1}. [${habit.getStatus()}] ${habit.name}`);
      console.log(`   Target       : ${habit.targetFrequency}x/minggu`);
      console.log(
        `   Progress     : ${progress} (${habit.getProgressPercentage()}%)`
      );
      console.log(
        `   Progress Bar : ${progressBar} ${habit.getProgressPercentage()}%`
      );
      console.log(`   Dibuat Pada  : ${habit.createdAt.toDateString()}`);
      console.log('--------------------------------------------------');
    });
    console.log('');
  }

  displayHabitsWithWhile() {
    console.log('=== Demo While Loop ===');
    if (this.habits.length === 0) {
      console.log('Belum ada kebiasaan untuk ditampilkan.\n');
      return;
    }
    let index = 0;
    while (index < this.habits.length) {
      const habit = this.habits[index];
      console.log(`${index + 1}. ${habit.name} - Status: ${habit.getStatus()}`);
      index += 1;
    }
    console.log('');
  }

  displayHabitsWithFor() {
    console.log('=== Demo For Loop ===');
    if (this.habits.length === 0) {
      console.log('Belum ada kebiasaan untuk ditampilkan.\n');
      return;
    }
    for (let i = 0; i < this.habits.length; i += 1) {
      const habit = this.habits[i];
      const completions = habit.getThisWeekCompletions().length;
      console.log(
        `${i + 1}. ${habit.name} - Progress minggu ini: ${completions}/${
          habit.targetFrequency
        }`
      );
    }
    console.log('');
  }

  displayStats() {
    if (this.habits.length === 0) {
      console.log('Belum ada kebiasaan untuk dihitung statistiknya.\n');
      return;
    }

    const totalTarget = this.habits.reduce(
      (acc, habit) => acc + habit.targetFrequency,
      0
    );
    const totalCompletions = this.habits
      .map((habit) => habit.getThisWeekCompletions().length)
      .reduce((acc, count) => acc + count, 0);
    const averageProgress = Math.round(
      this.habits
        .map((habit) => habit.getProgressPercentage())
        .reduce((a, b) => a + b, 0) / this.habits.length
    );
    const activeHabits = this.habits.filter(
      (habit) => !habit.isCompletedThisWeek()
    ).length;
    const completedHabits = this.habits.filter((habit) =>
      habit.isCompletedThisWeek()
    ).length;

    console.log('==================================================');
    console.log('STATISTIK KEBIASAAN');
    console.log('==================================================');
    console.log(`Total Target Minggu Ini  : ${totalTarget}`);
    console.log(`Total Selesai Minggu Ini : ${totalCompletions}`);
    console.log(`Rata-rata Progress       : ${averageProgress}%`);
    console.log(`Aktif                    : ${activeHabits}`);
    console.log(`Selesai                  : ${completedHabits}`);
    console.log('==================================================');
    console.log('');
  }

  startReminder() {
    if (this.reminderIntervalId) {
      return;
    }
    this.reminderIntervalId = setInterval(() => {
      this.showReminder();
    }, REMINDER_INTERVAL);
  }

  showReminder() {
    const habitToRemind = this.habits.find(
      (habit) => !habit.isCompletedThisWeek()
    );
    if (!habitToRemind) {
      return;
    }
    console.log('==================================================');
    console.log(`REMINDER: Jangan lupa "${habitToRemind.name}"!`);
    console.log('==================================================');
  }

  stopReminder() {
    if (this.reminderIntervalId) {
      clearInterval(this.reminderIntervalId);
      this.reminderIntervalId = null;
    }
  }

  saveToFile() {
    try {
      const data = {
        userProfile: {
          name: userProfile.name,
          joinDate: (userProfile.joinDate ?? new Date()).toISOString(),
          totalHabits: userProfile.totalHabits,
          completedThisWeek: userProfile.completedThisWeek,
        },
        habits: this.habits.map((habit) => habit.toJSON()),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Terjadi kesalahan saat menyimpan data:', error.message);
    }
  }

  loadFromFile() {
    if (!fs.existsSync(DATA_FILE)) {
      userProfile.joinDate = userProfile.joinDate ?? new Date();
      return;
    }

    try {
      const jsonData = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(jsonData ?? '{}');
      const storedProfile = data.userProfile ?? {};
      userProfile.name = storedProfile.name ?? userProfile.name;
      userProfile.joinDate = Habit.normalizeDate(storedProfile.joinDate);
      userProfile.totalHabits = storedProfile.totalHabits ?? 0;
      userProfile.completedThisWeek = storedProfile.completedThisWeek ?? 0;

      const storedHabits = data.habits ?? [];
      this.habits = storedHabits.map(
        (habitData) =>
          new Habit(habitData.name, habitData.targetFrequency, habitData)
      );
      userProfile.updateStats(this.habits);
    } catch (error) {
      console.error('Terjadi kesalahan saat memuat data:', error.message);
    }
  }

  clearAllData() {
    this.habits = [];
    userProfile.totalHabits = 0;
    userProfile.completedThisWeek = 0;
    this.saveToFile();
    console.log('Semua data kebiasaan telah dihapus.');
  }

  generateProgressBar(percentage) {
    const filledBlocks = Math.round((percentage / 100) * 10);
    const emptyBlocks = 10 - filledBlocks;
    return `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}`;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function displayMenu() {
  console.log('==================================================');
  console.log('HABIT TRACKER - MAIN MENU');
  console.log('==================================================');
  console.log('1. Lihat Profil');
  console.log('2. Lihat Semua Kebiasaan');
  console.log('3. Lihat Kebiasaan Aktif');
  console.log('4. Lihat Kebiasaan Selesai');
  console.log('5. Tambah Kebiasaan Baru');
  console.log('6. Tandai Kebiasaan Selesai');
  console.log('7. Hapus Kebiasaan');
  console.log('8. Lihat Statistik');
  console.log('9. Demo Loop (while/for)');
  console.log('0. Keluar');
  console.log('==================================================');
}

async function handleMenu(tracker) {
  let exitRequested = false;
  tracker.startReminder();

  while (!exitRequested) {
    displayMenu();
    const choice = (await askQuestion('Pilih menu (0-9): ')).trim();

    switch (choice) {
      case '1':
        tracker.displayProfile();
        break;
      case '2':
        tracker.displayHabits('all');
        break;
      case '3':
        tracker.displayHabits('active');
        break;
      case '4':
        tracker.displayHabits('completed');
        break;
      case '5': {
        const nameInput = await askQuestion('Nama kebiasaan: ');
        const frequencyInput = await askQuestion('Target per minggu (angka): ');
        const sanitizedName = (nameInput?.trim() ?? '') || 'Kebiasaan Baru';
        tracker.addHabit(sanitizedName, frequencyInput);
        break;
      }
      case '6': {
        if (tracker.habits.length === 0) {
          console.log('Belum ada kebiasaan untuk ditandai selesai.\n');
          break;
        }
        tracker.displayHabits('all');
        const indexInput = await askQuestion(
          'Masukkan nomor kebiasaan yang selesai: '
        );
        const index = Number(indexInput);
        tracker.completeHabit(Number.isNaN(index) ? 0 : index);
        break;
      }
      case '7': {
        if (tracker.habits.length === 0) {
          console.log('Belum ada kebiasaan untuk dihapus.\n');
          break;
        }
        tracker.displayHabits('all');
        const indexInput = await askQuestion(
          'Masukkan nomor kebiasaan yang akan dihapus: '
        );
        const index = Number(indexInput);
        tracker.deleteHabit(Number.isNaN(index) ? 0 : index);
        break;
      }
      case '8':
        tracker.displayStats();
        break;
      case '9':
        tracker.displayHabitsWithWhile();
        tracker.displayHabitsWithFor();
        break;
      case '0':
        exitRequested = true;
        tracker.stopReminder();
        tracker.saveToFile();
        console.log('Sampai jumpa! Tetap konsisten dengan kebiasaanmu.');
        break;
      default:
        console.log('Pilihan tidak valid. Silakan coba lagi.\n');
        break;
    }
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.clear();
  console.log('==================================================');
  console.log('SELAMAT DATANG DI HABIT TRACKER CLI');
  console.log('==================================================\n');

  const tracker = new HabitTracker();
  tracker.loadFromFile();

  if (tracker.habits.length === 0) {
    console.log(
      '💡 Tip: Tambahkan kebiasaan baru untuk memulai perjalananmu!\n'
    );
  } else {
    console.log(
      `📦 Data kebiasaan berhasil dimuat (${tracker.habits.length} kebiasaan).\n`
    );
  }

  try {
    await handleMenu(tracker);
  } catch (error) {
    console.error('Terjadi kesalahan yang tidak terduga:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Gagal menjalankan aplikasi:', error.message);
  rl.close();
  process.exit(1);
});
