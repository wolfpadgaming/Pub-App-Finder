import { X, Footprints, Beer, Crown, Clover, MapPin, Calendar, Target, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCheckIns } from '../hooks/useCheckIns';
import { useCrawls } from '../hooks/useCrawls';
import { calculateCalories, calculatePints } from '../lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubs: any[];
}

interface Badge {
  id: string;
  name: string;
  icon: typeof Beer;
  unlocked: boolean;
  description: string;
}

export function ProfileModal({ isOpen, onClose, pubs }: ProfileModalProps) {
  const { profile } = useAuth();
  const { checkIns } = useCheckIns();
  const { crawls } = useCrawls();

  if (!isOpen || !profile) return null;

  const totalDistance = checkIns.reduce((sum, ci) => sum + (ci.distance_walked || 0), 0);
  const totalCalories = calculateCalories(totalDistance);
  const totalPints = calculatePints(totalCalories);

  const uniquePubs = new Set(checkIns.map(c => c.pub_id)).size;

  const guinnessCheckIns = checkIns.filter(ci => {
    const pub = pubs.find(p => p.id === ci.pub_id);
    return pub?.good_guinness;
  });

  const weekendCheckIns = checkIns.filter(ci => {
    const date = new Date(ci.created_at);
    const day = date.getDay();
    return day === 0 || day === 6;
  });

  const consecutiveDaysCheckIns = () => {
    if (checkIns.length === 0) return 0;
    const dates = checkIns.map(ci => new Date(ci.created_at).toDateString());
    const uniqueDates = [...new Set(dates)].sort();
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    return maxStreak;
  };

  const allBadges: Badge[] = [
    {
      id: 'first_checkin',
      name: 'First Pint',
      icon: Beer,
      unlocked: checkIns.length >= 1,
      description: 'Check in to your first pub'
    },
    {
      id: 'explorer',
      name: 'Explorer',
      icon: MapPin,
      unlocked: uniquePubs >= 5,
      description: 'Visit 5 different pubs'
    },
    {
      id: 'local_legend',
      name: 'Local Legend',
      icon: Crown,
      unlocked: checkIns.length >= 10,
      description: 'Complete 10 check-ins'
    },
    {
      id: 'guinness_guru',
      name: 'Guinness Guru',
      icon: Clover,
      unlocked: guinnessCheckIns.length >= 3,
      description: 'Check in to 3 pubs with good Guinness'
    },
    {
      id: 'weekend_warrior',
      name: 'Weekend Warrior',
      icon: Calendar,
      unlocked: weekendCheckIns.length >= 5,
      description: 'Make 5 weekend check-ins'
    },
    {
      id: 'streak_master',
      name: 'Streak Master',
      icon: Target,
      unlocked: consecutiveDaysCheckIns() >= 3,
      description: 'Check in 3 days in a row'
    },
    {
      id: 'crawl_champion',
      name: 'Crawl Champion',
      icon: Trophy,
      unlocked: crawls.length >= 1,
      description: 'Complete your first pub crawl'
    },
    {
      id: 'marathon_walker',
      name: 'Marathon Walker',
      icon: Footprints,
      unlocked: totalDistance >= 10,
      description: 'Walk 10km to pubs'
    },
  ];

  const unlockedBadges = allBadges.filter(b => b.unlocked);

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl z-50 max-h-[80vh] flex flex-col">
        <div className="p-4 flex justify-between items-center border-b flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">My Profile</h2>
            <p className="text-sm text-gray-500">@{profile.username}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <h3 className="font-bold text-lg mb-2">My Check-ins</h3>
          {checkIns.length > 0 ? (
            <p className="text-sm text-gray-600 mb-6">
              You have {checkIns.length} check-ins at {uniquePubs} different pubs.
            </p>
          ) : (
            <p className="text-sm text-gray-600 mb-6">
              You haven't checked in anywhere yet. Start exploring!
            </p>
          )}

          <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-bold text-lg text-green-800 mb-3 flex items-center gap-2">
              <Footprints className="w-5 h-5" />
              My Walking Stats
            </h3>
            <div className="grid grid-cols-3 text-center gap-4">
              <div>
                <p className="text-2xl font-bold text-green-800">{totalDistance.toFixed(1)}</p>
                <p className="text-xs text-green-700">km walked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-800">{Math.round(totalCalories)}</p>
                <p className="text-xs text-green-700">calories burned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-800">{totalPints.toFixed(1)}</p>
                <p className="text-xs text-green-700">pints earned</p>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-3">
            My Badges ({unlockedBadges.length}/{allBadges.length})
          </h3>
          <div className="grid grid-cols-4 gap-3 text-center mb-4">
            {allBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`relative group ${badge.unlocked ? 'opacity-100' : 'opacity-30'}`}
                  title={badge.description}
                >
                  <div
                    className={`p-2 rounded-lg transition-all ${
                      badge.unlocked ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mx-auto ${
                      badge.unlocked ? 'text-yellow-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className="text-xs font-semibold mt-1 truncate">{badge.name}</p>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {badge.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
