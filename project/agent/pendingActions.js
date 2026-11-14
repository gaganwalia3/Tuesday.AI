const pendingActions = new Map();

function createPendingAction(data) {

    const id =
        `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;

    pendingActions.set(id, {
        ...data,
        createdAt: new Date().toISOString()
    });

    return id;
}


function getPendingAction(id) {
    return pendingActions.get(id);
}


function deletePendingAction(id) {
    pendingActions.delete(id);
}


module.exports = {
    createPendingAction,
    getPendingAction,
    deletePendingAction
};