const detectIdentifierType = (identifier) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier) ? 'email' : 'phone';
};


export default detectIdentifierType