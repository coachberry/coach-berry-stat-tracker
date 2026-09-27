import { useState } from 'react';
import RosterManager from './RosterManager-v2';
import GameEntry from './GameEntry-v2';
import GameDisplay from './GameDisplay-v2';
import SeasonStats from './SeasonStats-v2';
import TeamStats from './TeamStats-v2';
import PlayerStats from './PlayerStats-v2';
import './TeamDashboard.css';

export default function TeamDashboard({ teamId, teamName, currentPage, setCurrentPage }) {
  return (
    <div className="team-dashboard">
      <nav className="dashboard-nav">
        <button className={currentPage === 'roster'       ? 'active' : ''} onClick={() => setCurrentPage('roster')}>🏒 Roster</button>
        <button className={currentPage === 'game-entry'   ? 'active' : ''} onClick={() => setCurrentPage('game-entry')}>📝 Add Game</button>
        <button className={currentPage === 'game-display' ? 'active' : ''} onClick={() => setCurrentPage('game-display')}>📊 Game Stats</button>
        <button className={currentPage === 'season-stats' ? 'active' : ''} onClick={() => setCurrentPage('season-stats')}>📈 Season Stats</button>
        <button className={currentPage === 'team-stats'   ? 'active' : ''} onClick={() => setCurrentPage('team-stats')}>🎯 Team Stats</button>
        <button className={currentPage === 'player-stats' ? 'active' : ''} onClick={() => setCurrentPage('player-stats')}>👤 Player Stats</button>
      </nav>

      <main className="dashboard-content">
        {currentPage === 'roster'       && <RosterManager teamId={teamId} />}
        {currentPage === 'game-entry'   && <GameEntry     teamId={teamId} />}
        {currentPage === 'game-display' && <GameDisplay   teamId={teamId} teamName={teamName} />}
        {currentPage === 'season-stats' && <SeasonStats   teamId={teamId} />}
        {currentPage === 'team-stats'   && <TeamStats     teamId={teamId} teamName={teamName} />}
        {currentPage === 'player-stats' && <PlayerStats   teamId={teamId} />}
      </main>
    </div>
  );
}
