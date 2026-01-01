import { UserPoints } from "@/entities/UserPoints";
import { UserBadge } from "@/entities/UserBadge";

// Points Configuration
export const POINTS = {
  VIDEO_WATCHED: 10,
  QUIZ_COMPLETED: 20,
  QUIZ_PASSED: 30,
  QUIZ_PERFECT: 50,
  COURSE_COMPLETED: 100,
  CERTIFICATE_EARNED: 150,
  STREAK_BONUS: 5 // Per day of streak
};

// Badge Definitions
export const BADGES = {
  FIRST_VIDEO: {
    id: "first_video",
    name: "Primeiro Passo",
    description: "Assistiu ao primeiro vídeo",
    icon: "Play",
    color: "bg-blue-500"
  },
  FIRST_QUIZ: {
    id: "first_quiz",
    name: "Testando Conhecimento",
    description: "Completou a primeira prova",
    icon: "FileQuestion",
    color: "bg-purple-500"
  },
  FIRST_CERTIFICATE: {
    id: "first_certificate",
    name: "Certificado Inaugural",
    description: "Obteve o primeiro certificado",
    icon: "Award",
    color: "bg-amber-500"
  },
  VIDEOS_10: {
    id: "videos_10",
    name: "Maratonista",
    description: "Assistiu 10 vídeos",
    icon: "Video",
    color: "bg-indigo-500"
  },
  VIDEOS_50: {
    id: "videos_50",
    name: "Cinéfilo do Conhecimento",
    description: "Assistiu 50 vídeos",
    icon: "Clapperboard",
    color: "bg-pink-500"
  },
  QUIZZES_5: {
    id: "quizzes_5",
    name: "Estudante Dedicado",
    description: "Passou em 5 provas",
    icon: "CheckCircle2",
    color: "bg-green-500"
  },
  QUIZZES_20: {
    id: "quizzes_20",
    name: "Mestre dos Quizzes",
    description: "Passou em 20 provas",
    icon: "Trophy",
    color: "bg-yellow-500"
  },
  COURSES_3: {
    id: "courses_3",
    name: "Triplo Conhecimento",
    description: "Concluiu 3 cursos",
    icon: "GraduationCap",
    color: "bg-teal-500"
  },
  COURSES_10: {
    id: "courses_10",
    name: "Especialista",
    description: "Concluiu 10 cursos",
    icon: "Star",
    color: "bg-orange-500"
  },
  PERFECT_SCORE: {
    id: "perfect_score",
    name: "Perfeição",
    description: "Obteve 100% em uma prova",
    icon: "Sparkles",
    color: "bg-rose-500"
  },
  PERFECT_5: {
    id: "perfect_5",
    name: "Gênio",
    description: "Obteve 100% em 5 provas",
    icon: "Brain",
    color: "bg-violet-500"
  },
  STREAK_7: {
    id: "streak_7",
    name: "Consistência",
    description: "7 dias seguidos estudando",
    icon: "Flame",
    color: "bg-red-500"
  },
  STREAK_30: {
    id: "streak_30",
    name: "Inabalável",
    description: "30 dias seguidos estudando",
    icon: "Zap",
    color: "bg-cyan-500"
  },
  POINTS_500: {
    id: "points_500",
    name: "Acumulador",
    description: "Alcançou 500 pontos",
    icon: "Coins",
    color: "bg-emerald-500"
  },
  POINTS_2000: {
    id: "points_2000",
    name: "Milionário do Conhecimento",
    description: "Alcançou 2000 pontos",
    icon: "Crown",
    color: "bg-amber-600"
  }
};

export async function getUserPoints(userEmail) {
  try {
    const points = await UserPoints.filter({ user_email: userEmail });
    if (points.length > 0) {
      return points[0];
    }
    // Create new record
    return await UserPoints.create({
      user_email: userEmail,
      total_points: 0,
      videos_watched: 0,
      quizzes_completed: 0,
      quizzes_passed: 0,
      courses_completed: 0,
      certificates_earned: 0,
      perfect_scores: 0,
      current_streak: 0,
      best_streak: 0
    });
  } catch (error) {
    console.error("Erro ao buscar pontos:", error);
    return null;
  }
}

export async function getUserBadges(userEmail) {
  try {
    return await UserBadge.filter({ user_email: userEmail });
  } catch (error) {
    console.error("Erro ao buscar badges:", error);
    return [];
  }
}

export async function awardBadge(userEmail, badgeKey) {
  const badge = BADGES[badgeKey];
  if (!badge) return null;

  try {
    // Check if already has badge
    const existing = await UserBadge.filter({
      user_email: userEmail,
      badge_id: badge.id
    });

    if (existing.length > 0) return null;

    // Award new badge
    return await UserBadge.create({
      user_email: userEmail,
      badge_id: badge.id,
      badge_name: badge.name,
      badge_description: badge.description,
      badge_icon: badge.icon,
      badge_color: badge.color,
      earned_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao conceder badge:", error);
    return null;
  }
}

export async function addPoints(userEmail, pointType, extraData = {}) {
  try {
    const userPoints = await getUserPoints(userEmail);
    if (!userPoints) return null;

    const today = new Date().toISOString().split('T')[0];
    let pointsToAdd = POINTS[pointType] || 0;
    
    const updates = {
      total_points: (userPoints.total_points || 0) + pointsToAdd
    };

    // Update specific counters
    switch (pointType) {
      case 'VIDEO_WATCHED':
        updates.videos_watched = (userPoints.videos_watched || 0) + 1;
        break;
      case 'QUIZ_COMPLETED':
        updates.quizzes_completed = (userPoints.quizzes_completed || 0) + 1;
        break;
      case 'QUIZ_PASSED':
        updates.quizzes_passed = (userPoints.quizzes_passed || 0) + 1;
        break;
      case 'QUIZ_PERFECT':
        updates.perfect_scores = (userPoints.perfect_scores || 0) + 1;
        break;
      case 'COURSE_COMPLETED':
        updates.courses_completed = (userPoints.courses_completed || 0) + 1;
        break;
      case 'CERTIFICATE_EARNED':
        updates.certificates_earned = (userPoints.certificates_earned || 0) + 1;
        break;
    }

    // Update streak
    if (userPoints.last_activity_date) {
      const lastDate = new Date(userPoints.last_activity_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        updates.current_streak = (userPoints.current_streak || 0) + 1;
        updates.total_points += POINTS.STREAK_BONUS;
      } else if (diffDays > 1) {
        updates.current_streak = 1;
      }
    } else {
      updates.current_streak = 1;
    }

    if ((updates.current_streak || userPoints.current_streak) > (userPoints.best_streak || 0)) {
      updates.best_streak = updates.current_streak || userPoints.current_streak;
    }

    updates.last_activity_date = today;

    await UserPoints.update(userPoints.id, updates);

    // Check for new badges
    const newBadges = await checkAndAwardBadges(userEmail, {
      ...userPoints,
      ...updates
    });

    return {
      pointsAdded: pointsToAdd,
      newTotal: updates.total_points,
      newBadges
    };
  } catch (error) {
    console.error("Erro ao adicionar pontos:", error);
    return null;
  }
}

async function checkAndAwardBadges(userEmail, stats) {
  const newBadges = [];

  // Video badges
  if (stats.videos_watched >= 1) {
    const b = await awardBadge(userEmail, 'FIRST_VIDEO');
    if (b) newBadges.push(b);
  }
  if (stats.videos_watched >= 10) {
    const b = await awardBadge(userEmail, 'VIDEOS_10');
    if (b) newBadges.push(b);
  }
  if (stats.videos_watched >= 50) {
    const b = await awardBadge(userEmail, 'VIDEOS_50');
    if (b) newBadges.push(b);
  }

  // Quiz badges
  if (stats.quizzes_completed >= 1) {
    const b = await awardBadge(userEmail, 'FIRST_QUIZ');
    if (b) newBadges.push(b);
  }
  if (stats.quizzes_passed >= 5) {
    const b = await awardBadge(userEmail, 'QUIZZES_5');
    if (b) newBadges.push(b);
  }
  if (stats.quizzes_passed >= 20) {
    const b = await awardBadge(userEmail, 'QUIZZES_20');
    if (b) newBadges.push(b);
  }

  // Perfect score badges
  if (stats.perfect_scores >= 1) {
    const b = await awardBadge(userEmail, 'PERFECT_SCORE');
    if (b) newBadges.push(b);
  }
  if (stats.perfect_scores >= 5) {
    const b = await awardBadge(userEmail, 'PERFECT_5');
    if (b) newBadges.push(b);
  }

  // Course badges
  if (stats.courses_completed >= 3) {
    const b = await awardBadge(userEmail, 'COURSES_3');
    if (b) newBadges.push(b);
  }
  if (stats.courses_completed >= 10) {
    const b = await awardBadge(userEmail, 'COURSES_10');
    if (b) newBadges.push(b);
  }

  // Certificate badge
  if (stats.certificates_earned >= 1) {
    const b = await awardBadge(userEmail, 'FIRST_CERTIFICATE');
    if (b) newBadges.push(b);
  }

  // Streak badges
  if (stats.current_streak >= 7) {
    const b = await awardBadge(userEmail, 'STREAK_7');
    if (b) newBadges.push(b);
  }
  if (stats.current_streak >= 30) {
    const b = await awardBadge(userEmail, 'STREAK_30');
    if (b) newBadges.push(b);
  }

  // Points badges
  if (stats.total_points >= 500) {
    const b = await awardBadge(userEmail, 'POINTS_500');
    if (b) newBadges.push(b);
  }
  if (stats.total_points >= 2000) {
    const b = await awardBadge(userEmail, 'POINTS_2000');
    if (b) newBadges.push(b);
  }

  return newBadges;
}