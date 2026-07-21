import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/store';
import ClubStatusBar from '../components/career/ClubStatusBar';
import TransferWindowPanel from '../components/career/TransferWindowPanel';
import PreseasonPanel from '../components/career/PreseasonPanel';
import EventPanel from '../components/career/EventPanel';
import SeasonSimPanel from '../components/career/SeasonSimPanel';
import SeasonEndPanel from '../components/career/SeasonEndPanel';
import CareerRecap from '../components/end/CareerRecap';

export default function CareerPage() {
  const career = useGameStore((s) => s.career);
  const navigate = useNavigate();

  useEffect(() => {
    if (!career) navigate('/creation');
  }, [career, navigate]);

  if (!career) return null;

  if (career.retired) {
    return <CareerRecap career={career} />;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <ClubStatusBar career={career} />
      {career.phase === 'transfer_window' && <TransferWindowPanel career={career} />}
      {career.phase === 'preseason' && <PreseasonPanel career={career} />}
      {(career.phase === 'event' || career.phase === 'mid_season') && <EventPanel career={career} />}
      {career.phase === 'season_sim' && <SeasonSimPanel career={career} />}
      {career.phase === 'season_end' && <SeasonEndPanel career={career} />}
    </div>
  );
}
