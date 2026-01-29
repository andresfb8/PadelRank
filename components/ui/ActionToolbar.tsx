import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './Components';

export interface ToolbarAction {
    id: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    onClick: () => void;
    visible?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    title?: string;
    className?: string;
}

export interface ActionGroup {
    id: string;
    actions: ToolbarAction[];
}

interface ActionToolbarProps {
    actions: ToolbarAction[];
    groups?: ActionGroup[];
    maxVisibleActions?: number;
    primaryActionIds?: string[]; // IDs of actions that should always be visible
    className?: string;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
    actions,
    groups,
    maxVisibleActions = 6,
    primaryActionIds = [],
    className = ''
}) => {
    const [showOverflow, setShowOverflow] = useState(false);
    const overflowRef = useRef<HTMLDivElement>(null);

    // Filter visible actions
    const visibleActions = actions.filter(action => action.visible !== false);

    // Separate primary and secondary actions
    let primaryActions: ToolbarAction[];
    let overflowActions: ToolbarAction[];

    if (primaryActionIds.length > 0) {
        // Use specified primary actions
        primaryActions = visibleActions.filter(action => primaryActionIds.includes(action.id));
        overflowActions = visibleActions.filter(action => !primaryActionIds.includes(action.id));
    } else {
        // Use maxVisibleActions to determine split
        primaryActions = visibleActions.slice(0, maxVisibleActions);
        overflowActions = visibleActions.slice(maxVisibleActions);
    }

    // Close overflow menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
                setShowOverflow(false);
            }
        };

        if (showOverflow) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showOverflow]);

    const getButtonVariant = (variant?: string) => {
        switch (variant) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'primary':
                return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'secondary':
            default:
                return 'bg-gray-100 hover:bg-gray-200 text-gray-700';
        }
    };

    const renderAction = (action: ToolbarAction, isInMenu = false) => {
        const Icon = action.icon;

        if (isInMenu) {
            return (
                <button
                    key={action.id}
                    onClick={() => {
                        action.onClick();
                        setShowOverflow(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors"
                    title={action.title}
                >
                    <Icon size={16} />
                    <span>{action.label}</span>
                </button>
            );
        }

        return (
            <Button
                key={action.id}
                onClick={action.onClick}
                className={`flex items-center gap-2 ${getButtonVariant(action.variant)} ${action.className || ''}`}
                title={action.title || action.label}
            >
                <Icon size={18} />
                <span className="hidden sm:inline">{action.label}</span>
            </Button>
        );
    };

    // Render with groups if provided
    if (groups) {
        return (
            <div className={`flex gap-2 flex-wrap items-center ${className}`}>
                {groups.map((group, index) => (
                    <React.Fragment key={group.id}>
                        {group.actions
                            .filter(action => action.visible !== false)
                            .map(action => renderAction(action))}
                        {index < groups.length - 1 && (
                            <div className="h-6 w-px bg-gray-300 mx-1" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // Render with overflow menu
    return (
        <div className={`flex gap-2 items-center ${className}`}>
            {primaryActions.map(action => renderAction(action))}

            {overflowActions.length > 0 && (
                <div className="relative" ref={overflowRef}>
                    <Button
                        onClick={() => setShowOverflow(!showOverflow)}
                        variant="secondary"
                        className="text-gray-600 flex items-center gap-2 hover:bg-gray-100"
                        title="Más acciones"
                    >
                        <MoreHorizontal size={18} />
                    </Button>

                    {showOverflow && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            {overflowActions.map(action => renderAction(action, true))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
