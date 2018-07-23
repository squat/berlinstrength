import * as React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { TransitionGroup } from 'react-transition-group';
import * as redux from 'redux';

import { scanSeen } from '../actions';
import { All } from '../reducers';
import { clientOK, NetworkClient } from '../reducers/client';
import { Scan } from '../reducers/scan';
import { Avatar } from './avatar';
import { Fade } from './fade';

type FeedProps = {
    clients: Map<string, NetworkClient>
    scans: Scan[]
    inFlight: boolean
};

const miniscanHeight: number = 7;
const miniscanMargin: number = 0.5;
const dismissHeight: number = 2;

const feed: React.SFC = ({clients, dispatch, scans}:
    (FeedProps & {dispatch: redux.Dispatch<redux.AnyAction>})): JSX.Element => {
    const u: string[] = [];
    const s = scans.reduce<JSX.Element[]>((res, sc) => {
        const n = sc.error ? clients.get('error') : clients.get(sc.id);
        if (n && !sc.seen) {
            const t: number = (miniscanHeight + miniscanMargin) * res.length;
            res.push((
                <Fade key={sc.uuid} >
                    <MiniScan client={n} style={{top: `${t}em`}} dispatch={dispatch} uuid={sc.uuid}/>
                </Fade>
            ));
            u.push(sc.uuid);
        }
        return res;
    }, []);
    const dismiss = (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        u.forEach((uuid) => dispatch(scanSeen(uuid, true)));
    };
    let h: number = 0;
    if (s.length) {
        h = (miniscanHeight + miniscanMargin) * s.length + dismissHeight;
        s.push((
            <Fade key="dismiss">
                <button onClick={dismiss} style={{bottom: 0, position: 'absolute', right: 0}}>dismiss all</button>
            </Fade>
        ));
    }
    return (
        <div className="transition feed" style={{height: `${h}em`, position: 'relative'}}>
            <TransitionGroup appear={true}>
                {s}
            </TransitionGroup>
        </div>
    );
};

type MiniScanProps = {
    client: NetworkClient
    dispatch: redux.Dispatch<redux.AnyAction>
    uuid: string
};

const MiniScan: React.SFC<MiniScanProps & React.HTMLAttributes<HTMLAnchorElement>> =
    ({client: c, dispatch, uuid, ...props}: MiniScanProps & React.HTMLAttributes<HTMLAnchorElement>) => {
    const className = `miniscan--${clientOK(c) ? 'ok' : 'error'}`;
    const u: string = `/scan/${c.error ? 'error' : c.client.bsID}`;
    const click = (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault();
        dispatch(scanSeen(uuid, true));
        dispatch(push(u));
    };
    const close = (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(scanSeen(uuid, true));
    };

    return (
        <a className={className} {...props} onClick={click} href={u}>
            <button className="dismiss" onClick={close}/>
            {c.client.photo && <Avatar className="avatar--miniscan" id={c.client.photo} size={100} />}
            <span>{c.error ? c.error : c.client.name}</span>
        </a>
    );
};

const mapStateToProps = (state: All, {}): FeedProps => (
    {
        clients: state.clients,
        inFlight: state.scan.inFlight,
        scans: state.scan.scans,
    }
);

const mapDispatchToProps = (dispatch: redux.Dispatch<redux.AnyAction>):
{dispatch: redux.Dispatch<redux.AnyAction>} => ({
    dispatch,
});

export const Feed = connect(mapStateToProps, mapDispatchToProps)(feed);
