import React from 'react';

interface BlueNotePageTemplateProps {
  section: string;
  children: React.ReactNode;
}

/**
 * Shared visual frame for every BlueNote workspace page.
 * Keeps page content visually consistent without owning page-specific behavior.
 */
export const BlueNotePageTemplate: React.FC<BlueNotePageTemplateProps> = ({
  section,
  children,
}) => {
  return (
    <div className="bn-page-template" data-section={section}>
      <div className="bn-page-content">
        {children}
      </div>
    </div>
  );
};
