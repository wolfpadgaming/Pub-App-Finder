import { supabase } from '../lib/supabase';

interface PubWithHours {
  id: string;
  lat: number;
  lng: number;
  name: string;
  opening_hours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

function isCurrentlyOpen(openingHours?: any): boolean {
  if (!openingHours) return true;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const todayHours = openingHours[today];
  if (!todayHours || todayHours.toLowerCase() === 'closed') return false;

  const timeRanges = todayHours.split(',').map((range: string) => range.trim());

  for (const range of timeRanges) {
    const match = range.match(/(\d{1,2}):(\d{2})\s*(?:AM|PM|am|pm)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(?:AM|PM|am|pm)?/);
    if (!match) continue;

    let openHour = parseInt(match[1]);
    const openMinute = parseInt(match[2]);
    let closeHour = parseInt(match[3]);
    const closeMinute = parseInt(match[4]);

    if (range.toLowerCase().includes('pm') && openHour < 12) {
      openHour += 12;
    }
    if (range.toLowerCase().includes('pm') && closeHour < 12 && closeHour !== openHour) {
      closeHour += 12;
    }

    const currentTime = currentHour * 60 + currentMinute;
    const openTime = openHour * 60 + openMinute;
    let closeTime = closeHour * 60 + closeMinute;

    if (closeTime === 0) {
      closeTime = 24 * 60;
    }

    if (closeTime < openTime) {
      if (currentTime >= openTime || currentTime <= closeTime) {
        return true;
      }
    } else {
      if (currentTime >= openTime && currentTime <= closeTime) {
        return true;
      }
    }
  }

  return false;
}

export async function updatePopularityScores(pubs: Array<PubWithHours>) {
  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  console.log(`🔄 Updating popularity for ${pubs.length} pubs`);
  console.log(`📅 Current time: ${days[dayOfWeek]} ${currentHour}:${now.getMinutes().toString().padStart(2, '0')}`);

  const { data: recentCheckIns, error: checkInError } = await supabase
    .from('check_ins')
    .select('pub_id')
    .gte('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString());

  if (checkInError) {
    console.warn('⚠️ Could not fetch check-ins:', checkInError.message);
  }

  const checkInCounts = (recentCheckIns || []).reduce((acc: Record<string, number>, checkIn) => {
    acc[checkIn.pub_id] = (acc[checkIn.pub_id] || 0) + 1;
    return acc;
  }, {});

  console.log(`✅ Found ${recentCheckIns?.length || 0} recent check-ins`);

  let openCount = 0;
  let closedCount = 0;

  const updates = pubs.map((pub) => {
    const isOpen = isCurrentlyOpen(pub.opening_hours);

    if (isOpen) {
      openCount++;
    } else {
      closedCount++;
    }

    if (!isOpen) {
      return {
        id: pub.id,
        popularity_score: 0,
        hot_now: false,
        last_popularity_check: now.toISOString()
      };
    }

    let popularityScore = 0;

    const recentCheckInCount = checkInCounts[pub.id] || 0;
    popularityScore += Math.min(recentCheckInCount * 15, 40);

    const basePopularity = 20;
    popularityScore += basePopularity;

    if ((currentHour >= 17 && currentHour <= 23)) {
      popularityScore += 25;
    }

    if (currentHour >= 12 && currentHour <= 14 && [6, 0].includes(dayOfWeek)) {
      popularityScore += 20;
    }

    if ([5, 6].includes(dayOfWeek) && currentHour >= 18) {
      popularityScore += 30;
    }

    if (currentHour >= 21 && currentHour <= 23 && [5, 6].includes(dayOfWeek)) {
      popularityScore += 15;
    }

    const randomVariance = Math.random() * 15 - 7.5;
    popularityScore += randomVariance;

    const isHot = popularityScore > 75 && recentCheckInCount > 0;

    return {
      id: pub.id,
      popularity_score: Math.round(Math.max(0, Math.min(100, popularityScore))),
      hot_now: isHot,
      last_popularity_check: now.toISOString()
    };
  });

  console.log(`📊 Status: ${openCount} open, ${closedCount} closed`);
  console.log('💾 Saving updates to database...');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('pubs')
      .update({
        popularity_score: update.popularity_score,
        hot_now: update.hot_now,
        last_popularity_check: update.last_popularity_check
      })
      .eq('id', update.id);

    if (updateError) {
      console.error(`❌ Failed to update pub ${update.id}:`, updateError.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`✅ Updated ${successCount} pubs successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);

  return updates;
}

export async function shouldUpdatePopularity(lastCheck?: string): boolean {
  if (!lastCheck) return true;

  const lastCheckDate = new Date(lastCheck);
  const now = new Date();
  const minutesSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / 1000 / 60;

  return minutesSinceLastCheck > 5;
}
