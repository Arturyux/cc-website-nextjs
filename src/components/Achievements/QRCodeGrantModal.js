import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faQrcode, faUsers, faCheck, faMinus, faPlus, faFloppyDisk, faRotateLeft } from '@fortawesome/free-solid-svg-icons';

function QRCodeGrantModal({
    isOpen,
    onClose,
    achievementData,
    patchUserMutation, // Expect the mutation hook itself
    isAdmin,
    usersData = [],
    isLoadingUsers = false,
    isUsersError = false,
    usersError = null,
}) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('qr');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [manualActionStatus, setManualActionStatus] = useState({ message: '', error: false });
    const [userViewFilter, setUserViewFilter] = useState('all');
    const [scoreInput, setScoreInput] = useState('');
    // --- Local state for immediate UI feedback for the selected user ---
    const [optimisticSelectedUserStatus, setOptimisticSelectedUserStatus] = useState(null);

    const achievementId = achievementData?.id;
    const achievementTitle = achievementData?.title;
    const isAttendance = achievementData?.attendanceCounter === true;
    const attendanceNeed = achievementData?.attendanceNeed;
    const isScoreEnabled = achievementData?.onScore === true;

    const qrCodeValue = useMemo(() => {
        if (!achievementId) return null;
        return JSON.stringify({
            type: "achievement_grant",
            achievementId: achievementId,
        });
    }, [achievementId]);

    // Base status map from props (React Query cache)
    const userStatusMap = useMemo(() => {
        const map = new Map();
        achievementData?.userHas?.forEach(u => {
            map.set(u.userID, { achieved: u.achived, count: u.attendanceCount || 0, score: u.score });
        });
        return map;
    }, [achievementData]);

    // Filter users based on search term and view filter (using base status map)
    const filteredUsers = useMemo(() => {
        if (!usersData) return [];
        let usersToFilter = usersData;
        if (userViewFilter === 'achieved') {
            usersToFilter = usersData.filter(user => userStatusMap.has(user.id) && userStatusMap.get(user.id).achieved);
        }
        if (!searchTerm) return usersToFilter;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return usersToFilter.filter(user =>
            user.username?.toLowerCase().includes(lowerSearchTerm) ||
            user.firstName?.toLowerCase().includes(lowerSearchTerm) ||
            user.lastName?.toLowerCase().includes(lowerSearchTerm) ||
            user.primaryEmailAddress?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [usersData, searchTerm, userViewFilter, userStatusMap]);

    // --- Determine the status to display for the *selected* user ---
    // Prioritize local optimistic state if it exists for the selected user
    const selectedUserDisplayStatus = useMemo(() => {
        if (!selectedUserId) return null;
        // If there's an optimistic override for the selected user, use it
        if (optimisticSelectedUserStatus && optimisticSelectedUserStatus.userId === selectedUserId) {
            return optimisticSelectedUserStatus.status;
        }
        // Otherwise, use the status from the main data prop
        return userStatusMap.get(selectedUserId) || { achieved: false, count: 0, score: null };
    }, [selectedUserId, userStatusMap, optimisticSelectedUserStatus]);
    // --- End status calculation ---

    const handleManualAction = async (actionType) => {
        if (!selectedUserId || !achievementId || !patchUserMutation || patchUserMutation.isPending) return;

        setManualActionStatus({ message: '', error: false });

        let action;
        let payload = { achievementId, targetUserId: selectedUserId };
        let predictedStatus = { ...selectedUserDisplayStatus }; // Start with current display status

        // Calculate the predicted state change
        if (actionType === 'grant') {
            action = 'setAchieved';
            payload.action = action;
            payload.achieved = true;
            predictedStatus.achieved = true;
        } else if (actionType === 'revoke') {
            action = 'setAchieved';
            payload.action = action;
            payload.achieved = false;
            predictedStatus.achieved = false;
            predictedStatus.count = 0; // Predict reset
            predictedStatus.score = null; // Predict reset
        } else if (actionType === 'increment') {
            action = 'updateCount';
            payload.action = action;
            payload.countChange = 1;
            const newCount = (predictedStatus.count || 0) + 1;
            predictedStatus.count = newCount;
            if (isAttendance && attendanceNeed && newCount >= attendanceNeed) {
                predictedStatus.achieved = true; // Predict auto-grant
            }
        } else if (actionType === 'decrement') {
            action = 'updateCount';
            payload.action = action;
            payload.countChange = -1;
            predictedStatus.count = Math.max(0, (predictedStatus.count || 0) - 1);
        } else if (actionType === 'setScore') {
            const scoreValue = scoreInput === '' ? 0 : parseInt(scoreInput, 10);
            if (isNaN(scoreValue)) {
                 setManualActionStatus({ message: 'Invalid score value.', error: true });
                 return;
            }
            action = 'updateScore';
            payload.action = action;
            payload.score = scoreValue;
            predictedStatus.score = scoreValue;
        } else {
            setManualActionStatus({ message: 'Invalid action type.', error: true });
            return;
        }

        // --- Apply local optimistic update for the selected user ---
        setOptimisticSelectedUserStatus({ userId: selectedUserId, status: predictedStatus });
        // --- End local optimistic update ---

        try {
            // Call the actual mutation (parent handles cache update & invalidation)
            await patchUserMutation.mutateAsync(payload);
            // Success message - UI already updated locally
            setManualActionStatus({ message: `Action '${actionType}' sent.`, error: false });
            // Clear local override *after* mutation succeeds and parent invalidates/refetches
            // We rely on the useEffect watching achievementData to clear the override
        } catch (error) {
            // Error handled by parent mutation's onError (which includes cache rollback)
            console.error(`Manual action '${actionType}' failed:`, error);
            setManualActionStatus({ message: error.message || `Failed to ${actionType}`, error: true });
            // --- Clear local override on error to revert UI ---
            setOptimisticSelectedUserStatus(null);
            // --- End clear local override ---
        }
    };

    // Update score input based on display status (which includes optimistic)
    useEffect(() => {
        if (selectedUserDisplayStatus) {
            setScoreInput(selectedUserDisplayStatus.score ?? '');
        } else {
            // Clear score input if no user is selected
             setScoreInput('');
        }
    }, [selectedUserDisplayStatus]);

    // Clear local overrides when the main data prop changes (after refetch)
    // or when the selected user changes
    useEffect(() => {
        setOptimisticSelectedUserStatus(null);
    }, [achievementData, selectedUserId]);


    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setActiveTab('qr');
            setSearchTerm('');
            setSelectedUserId(null);
            setManualActionStatus({ message: '', error: false });
            setUserViewFilter('all');
            setScoreInput('');
            setOptimisticSelectedUserStatus(null); // Clear overrides on close
        } else {
            setActiveTab('qr'); // Reset tab on open
        }
    }, [isOpen]);


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden p-0 relative border-2 border-gray-300 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors z-20 h-7 w-7 flex items-center justify-center bg-white/50 rounded-full"
                            aria-label="Close modal"
                        >
                            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                        </button>

                        <div className="p-5 border-b border-gray-300 bg-white/30">
                            <h2 className="text-xl font-bold text-center mb-3 text-gray-800">
                                {achievementTitle || 'Achievement'}
                            </h2>
                            <div className="flex justify-center border-b border-gray-300">
                                <button
                                    onClick={() => setActiveTab('qr')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                        activeTab === 'qr'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <FontAwesomeIcon icon={faQrcode} /> QR Code
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => setActiveTab('manual')}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'manual'
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faUsers} /> Manual Action
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-grow">
                            {activeTab === 'qr' && (
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 mb-4">
                                        {isAttendance
                                            ? `Scan to add +1 progress (Need ${attendanceNeed || '?'})`
                                            : 'Scan to grant this badge'}
                                    </p>
                                    {qrCodeValue ? (
                                        <QRCodeCanvas
                                            id={`qr-code-modal-${achievementId}`}
                                            value={qrCodeValue}
                                            size={220}
                                            level={"H"}
                                            includeMargin={true}
                                            className="mx-auto border bg-white p-2 rounded shadow"
                                        />
                                    ) : (
                                        <p className="text-red-500">Could not generate QR Code.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'manual' && isAdmin && (
                                <div>
                                    <h3 className="text-lg font-semibold text-center mb-4 text-gray-700">
                                        Select User and Action
                                    </h3>
                                    {isLoadingUsers && <p className="text-center text-gray-500">Loading users...</p>}
                                    {isUsersError && <p className="text-center text-red-500">Error loading users: {usersError?.message || 'Unknown error'}</p>}

                                    {!isLoadingUsers && !isUsersError && usersData && (
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Search user..."
                                                    value={searchTerm}
                                                    onChange={(e) => {
                                                        setSearchTerm(e.target.value);
                                                        setSelectedUserId(null);
                                                        setOptimisticSelectedUserStatus(null); // Clear override on search
                                                        setManualActionStatus({ message: '', error: false });
                                                    }}
                                                    className="flex-grow px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <span className="text-sm font-medium text-gray-600">View:</span>
                                                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                                                        <input type="radio" name="userViewFilter" value="all" checked={userViewFilter === 'all'} onChange={() => setUserViewFilter('all')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                                        All
                                                    </label>
                                                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                                                        <input type="radio" name="userViewFilter" value="achieved" checked={userViewFilter === 'achieved'} onChange={() => setUserViewFilter('achieved')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                                        Achieved
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="max-h-60 overflow-y-auto border rounded bg-white p-2 space-y-1">
                                                {filteredUsers.length === 0 && <p className="text-center text-gray-500 italic p-2">No users match criteria.</p>}
                                                {filteredUsers.map(user => {
                                                    // Use base status for filtering list, display status comes later
                                                    const baseStatus = userStatusMap.get(user.id);
                                                    const hasBadgeInCache = baseStatus?.achieved;
                                                    const isUserSelected = selectedUserId === user.id;
                                                    const isUserPending = patchUserMutation?.isPending && patchUserMutation?.variables?.targetUserId === user.id;

                                                    // Determine display status for *this specific user* in the list
                                                    const displayStatus = isUserSelected ? selectedUserDisplayStatus : baseStatus || { achieved: false, count: 0, score: null };
                                                    const displayHasBadge = displayStatus?.achieved;
                                                    const displayCount = displayStatus?.count ?? 0;
                                                    const displayScore = displayStatus?.score ?? '-';


                                                    return (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedUserId(user.id);
                                                                setOptimisticSelectedUserStatus(null); // Clear previous override
                                                                setManualActionStatus({ message: '', error: false });
                                                            }}
                                                            className={`w-full text-left p-2 rounded flex justify-between items-center transition-colors ${
                                                                isUserSelected ? 'bg-indigo-100 ring-1 ring-indigo-300' : 'hover:bg-gray-50'
                                                            } ${isUserPending ? 'opacity-50 cursor-wait' : ''}`}
                                                            disabled={isUserPending}
                                                        >
                                                            <div>
                                                                <span className="font-medium text-sm">{user.username || `${user.firstName || ''} ${user.lastName || ''}`}</span>
                                                                <span className="block text-xs text-gray-500">{user.primaryEmailAddress}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2 text-xs">
                                                                {isAttendance && <span className="text-gray-600">Count: {displayCount}</span>}
                                                                {isScoreEnabled && <span className="text-gray-600">Score: {displayScore}</span>}
                                                                {displayHasBadge && <FontAwesomeIcon icon={faCheck} className="text-green-500 h-4 w-4" title="Has Badge"/>}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {selectedUserId && selectedUserDisplayStatus && (
                                                <div className="bg-gray-50 p-4 rounded border space-y-3">
                                                    <p className="text-sm font-medium text-center text-gray-700">
                                                        Actions for: <span className="font-semibold">{usersData.find(u=>u.id === selectedUserId)?.username || selectedUserId}</span>
                                                        <span className={`ml-2 text-xs ${patchUserMutation?.isPending && patchUserMutation?.variables?.targetUserId === selectedUserId ? 'italic text-orange-600' : 'text-gray-600'}`}>
                                                            (Status: {selectedUserDisplayStatus.achieved ? 'Achieved' : 'Not Achieved'}
                                                            {isAttendance ? `, Count: ${selectedUserDisplayStatus.count ?? 0}` : ''}
                                                            {isScoreEnabled ? `, Score: ${selectedUserDisplayStatus.score ?? '-'}` : ''}
                                                            {patchUserMutation?.isPending && patchUserMutation?.variables?.targetUserId === selectedUserId ? ' - Pending...' : ''})
                                                        </span>
                                                    </p>
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        {!isAttendance && (
                                                            <>
                                                                <button onClick={() => handleManualAction('grant')} disabled={patchUserMutation?.isPending || selectedUserDisplayStatus.achieved} className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Grant Badge</button>
                                                                <button onClick={() => handleManualAction('revoke')} disabled={patchUserMutation?.isPending || !selectedUserDisplayStatus.achieved} className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Revoke Badge</button>
                                                            </>
                                                        )}
                                                        {isAttendance && (
                                                            <>
                                                                <button onClick={() => handleManualAction('increment')} disabled={patchUserMutation?.isPending || selectedUserDisplayStatus.achieved} className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                                                    <FontAwesomeIcon icon={faPlus} className="mr-1"/> Count
                                                                </button>
                                                                <button onClick={() => handleManualAction('decrement')} disabled={patchUserMutation?.isPending || (selectedUserDisplayStatus.count ?? 0) <= 0} className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                                                    <FontAwesomeIcon icon={faMinus} className="mr-1"/> Count
                                                                </button>
                                                                <button onClick={() => handleManualAction('revoke')} disabled={patchUserMutation?.isPending || !selectedUserDisplayStatus.achieved} className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                                                    <FontAwesomeIcon icon={faRotateLeft} className="mr-1"/> Revoke
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    {isScoreEnabled && (
                                                        <div className="flex items-center justify-center gap-2 pt-3 border-t">
                                                            <label htmlFor="manual-score" className="text-sm font-medium text-gray-700">Set Score:</label>
                                                            <input
                                                                type="number"
                                                                id="manual-score"
                                                                value={scoreInput}
                                                                onChange={(e) => setScoreInput(e.target.value)}
                                                                className="w-24 px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                                placeholder="Score"
                                                                disabled={patchUserMutation?.isPending}
                                                            />
                                                            <button onClick={() => handleManualAction('setScore')} disabled={patchUserMutation?.isPending} className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50">
                                                                <FontAwesomeIcon icon={faFloppyDisk} className="mr-1"/> Set
                                                            </button>
                                                        </div>
                                                    )}
                                                    {manualActionStatus.message && (
                                                        <p className={`text-xs text-center pt-2 ${manualActionStatus.error ? 'text-red-600' : 'text-green-700'}`}>
                                                            {manualActionStatus.message}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default QRCodeGrantModal;
