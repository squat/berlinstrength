import * as React from 'react';
import { Route, Switch, SwitchProps } from 'react-router';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

export const Fade = ({children, ...props}: {children: React.ReactNode} & any) => (
    <CSSTransition {...props} classNames="blur" timeout={150}>
        {React.isValidElement(children) ? children : <span/>}
    </CSSTransition>
);

export const LocationFadeRoutes = ({children}: {children: JSX.Element | JSX.Element[]}): JSX.Element => {
    const render = ({location}: SwitchProps): JSX.Element => (
        <TransitionGroup component="main">
            <Fade key={location ? location.pathname.split('/')[1] || '/' : '/'}>
                <div className="page">
                    <Switch location={location}>
                        {children}
                    </Switch>
                </div>
            </Fade>
        </TransitionGroup>
    );
    return <Route render={render}/>;
};
