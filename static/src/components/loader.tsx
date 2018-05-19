import * as React from 'react';

export const Loader: React.SFC = () => (
    <div className="center--xy spinner">
        <div className="rect1" />
        <div className="rect2" />
        <div className="rect3" />
        <div className="rect4" />
        <div className="rect5" />
    </div>
);

export const Spinner: React.SFC = () => (
    <svg className="spinner" viewBox="-25 -25 50 50">
        <circle cx="0" cy="0" r="20" fill="none" strokeWidth="5" />
    </svg>
);
