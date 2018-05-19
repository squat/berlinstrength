import * as React from 'react';

type AvatarProps = {
    id: string
    size?: number
};

export const Avatar: React.SFC<AvatarProps> = ({id, size = 200}: AvatarProps): JSX.Element => {
    return (
        <img src={`/photo/${id}`} className="avatar" height={size} width={size} />
    );
};
