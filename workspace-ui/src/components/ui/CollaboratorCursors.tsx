import React from 'react';
import { Collaborator } from '@/services/realtime';

interface CollaboratorCursorsProps {
  collaborators: Collaborator[];
  currentUserId: string;
}

export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({ 
  collaborators, 
  currentUserId 
}) => {
  // Nur andere User anzeigen, nicht sich selbst
  const otherUsers = collaborators.filter(c => c.id !== currentUserId && c.cursor);

  return (
    <>
      {otherUsers.map((user) => (
        <div
          key={user.id}
          className="absolute pointer-events-none z-50 transition-all duration-100 ease-out"
          style={{
            left: user.cursor!.x,
            top: user.cursor!.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor SVG */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md"
          >
            <path
              d="M5.5 3L19 12.5L12 13.5L9 20L5.5 3Z"
              fill={user.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* User Name Label */}
          <div
            className="absolute left-5 top-4 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap shadow-sm"
            style={{ backgroundColor: user.color }}
          >
            {user.name}
          </div>
        </div>
      ))}
    </>
  );
};

// Collaborator Avatars für die Toolbar
interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
  currentUserId: string;
  maxVisible?: number;
}

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  collaborators,
  currentUserId,
  maxVisible = 5,
}) => {
  const visibleUsers = collaborators.slice(0, maxVisible);
  const remainingCount = Math.max(0, collaborators.length - maxVisible);
  const isOnline = collaborators.length > 1;

  return (
    <div className="flex items-center gap-1">
      {/* Online-Status Punkt */}
      <div 
        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
        title={isOnline ? 'Online' : 'Offline'}
      />
      
      {/* Avatar Stack */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user, index) => (
          <div
            key={user.id}
            className="relative"
            style={{ zIndex: visibleUsers.length - index }}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2 border-white shadow-sm ${
                user.id === currentUserId ? 'ring-2 ring-blue-400' : ''
              }`}
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Online-Indikator */}
            {Date.now() - user.lastSeen < 30000 && (
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white" />
            )}
          </div>
        ))}
        
        {/* Remaining Count */}
        {remainingCount > 0 && (
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
};

