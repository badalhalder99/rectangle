import { useState } from 'react';

export const Instructions = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="instructions">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-2xl font-bold">WebXR Measure</h1>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
      <div className="space-y-2">
        <p className="font-medium">After pressing the START AR button:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Move your phone around until you see a marker</li>
          <li>Move marker to first measurement point</li>
          <li>Tap screen to start measurement</li>
          <li>Move marker to second measurement point</li>
          <li>Tap screen to complete measurement</li>
          <li>Distance will appear between points</li>
          <li>Repeat steps 2-5 for more measurements</li>
        </ol>
      </div>
    </div>
  );
};
