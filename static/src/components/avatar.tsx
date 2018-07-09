import * as React from 'react';

type AvatarProps = {
    className?: string
    id: string
    size?: number
};

export const Avatar: React.SFC<AvatarProps> = ({className, id, size = 200}: AvatarProps): JSX.Element => {
    const c = className ? 'avatar ' + className : 'avatar';
    return (
        <img src={`/photo/${id}`} className={c} height={size} width={size} />
    );
};
