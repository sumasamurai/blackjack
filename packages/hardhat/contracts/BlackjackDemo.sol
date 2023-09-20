// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract BlackjackDemo {
    // Constants for minimum and maximum bet amounts.
    uint256 private minBet = 0.01 ether;
    uint256 private maxBet = 1.01 ether;

    // Counter for generating unique game IDs.
    uint256 private gameIdCounter = 1;

    // Constants for total ranks and suits in a deck of cards.
    uint8 constant RANKS = 13;
    uint8 constant SUITS = 4;

    // The address of the contract owner.
    address public immutable owner;

    // Default deck of cards.
    uint8[2][] private unsortedDeck;

    constructor(address _owner) {
        owner = _owner;

        // Initialize the default deck of cards.
        unsortedDeck = new uint8[2][](RANKS * SUITS);
        for (uint8 i = 0; i < SUITS; i++) {
            for (uint8 j = 1; j <= RANKS; j++) {
                unsortedDeck[i * RANKS + j - 1][0] = j;
                unsortedDeck[i * RANKS + j - 1][1] = i;
            }
        }
    }

    // Modifier to check if the caller is the owner of the contract.
    modifier isOwner() {
        require(msg.sender == owner, "Not the Owner");
        _;
    }

    // Struct to represent a game instance.
    struct GameInstance {
        uint gameId;
        address player;
        uint betAmount;
        string gameStatus;
        uint256 claimableAmount;
        uint8[] firstDealerCard;
        uint8[2][] dealerHand;
        uint8[2][] playerHand;
        uint8 dealerScore;
        uint8 playerScore;
        uint8 turnCounter;
        uint8[2][] deck;
    }

    // Mapping to store game instances by player's address.
    mapping(address => GameInstance) public gamesByPlayer;

    // Mapping to associate player addresses with game IDs.
    mapping(address => uint) public gameIdByPlayer;

    // Event emitted when a new game is started.
    event Play(
        address indexed player,
        uint8[] firstDealerCard,
        uint8[2][] playerHand,
        uint8 playerScore,
        string gameStatus
    );

    // Event emitted when a player hits.
    event Hit(
        address indexed player,
        uint8[] firstDealerCard,
        uint8[2][] playerHand,
        uint8 playerScore,
        string gameStatus
    );

    // Event emitted when a player stands.
    event Stand(
        address indexed player,
        uint8[2][] playerHand,
        uint8[2][] dealerHand,
        uint claimableAmount,
        uint8 dealerScore,
        uint8 playerScore,
        string gameStatus
    );

    /**
     * @dev Allows a player to withdraw their available claimableAmount at any time.
     * Players can withdraw their winnings or available balance independently of the game status.
     * Emits a "Claim" event to log the successful withdrawal.
     */
    event Claim(
        address indexed player,
        uint claimableAmount
    );

    // Function to get the game ID associated with a player's address.
    function getGameIdByAddress(address playerAddress) public view returns (uint) {
        return gameIdByPlayer[playerAddress];
    }

    /**
     * @dev Starts a new game by allowing the player to place a bet and receive initial cards.
     * @dev msg.value The amount of Ether sent as a bet by the player.
     */
    function play() public payable {
        address player = msg.sender;
        GameInstance storage gameInstance = gamesByPlayer[player];

        // Ensure the player is not currently playing in another game.
        require(gameInstance.playerHand.length == 0, "You are already playing a game!");

        // Shuffle the deck for randomness.
        _shuffleDeck(player, block.number);

        // Assign a new gameId and store it for the player.
        gameInstance.gameId = gameIdCounter++;
        gameIdByPlayer[player] = gameInstance.gameId;



        // Deal initial cards to the player and dealer.
        for (uint8 i = 0; i < 2; i++) {
            gameInstance.playerHand.push(_drawCard(player));
            gameInstance.dealerHand.push(_drawCard(player));
        }

        // Calculate scores for the player and dealer.
        gameInstance.playerScore = _calculateHandScore(gameInstance.playerHand);
        gameInstance.dealerScore = _calculateHandScore(gameInstance.dealerHand);

        // Initialize the game instance with new information.
        gameInstance.player = player;
        gameInstance.betAmount = msg.value;
        gameInstance.gameStatus = "In Progress";
        gameInstance.firstDealerCard = gameInstance.dealerHand[0];

        // Emit a "Play" event with game details.
        emit Play(gameInstance.player, gameInstance.firstDealerCard, gameInstance.playerHand, gameInstance.playerScore, gameInstance.gameStatus);
    }

    /**
     * @dev Allows the player to hit and draw a card during the game.
     */
    function hit() public {
        address player = msg.sender;
        GameInstance storage gameInstance = gamesByPlayer[player];

        // Ensure the player is currently in a game.
        require(gameInstance.playerHand.length > 0, "You are not playing in the game.");

        // Draw a card for the player.
        gameInstance.playerHand.push(_drawCard(player));

        // Calculate the player's current score.
        gameInstance.playerScore = _calculateHandScore(gameInstance.playerHand);

        // Check if the player's score exceeds 21 (bust).
        if (gameInstance.playerScore > 21) {
            // Set the game status to "Player Lose."
            gameInstance.gameStatus = "Lose";

            // Emit a "Stand" event indicating the game outcome and reset the game instance.
            emit Stand(gameInstance.player, gameInstance.playerHand, gameInstance.dealerHand, gameInstance.claimableAmount, gameInstance.dealerScore, gameInstance.playerScore, gameInstance.gameStatus);

            // Reset the game instance for the player.
            _resetGameInstance(player);
        } else {
            // Emit a "Hit" event with player's information and current game status.
            emit Hit(gameInstance.player, gameInstance.firstDealerCard, gameInstance.playerHand, gameInstance.playerScore, gameInstance.gameStatus);
        }
    }

    /**
     * @dev Allows the player to stand in the game.
     * @notice This function lets a player make a decision to stand during their turn in the game of blackjack.
     * @dev If the player chooses to stand, the dealer continues to draw cards until their hand reaches a score of at least 17.
     * @dev After that, the function determines the game outcome, updates the game status, and credits the player's claimable amount accordingly.
     */
    function stand() public {
        GameInstance storage gameInstance = gamesByPlayer[msg.sender];
        address player = msg.sender;
        require(gameInstance.playerHand.length > 0, "You are not currently playing a game.");

        while (gameInstance.dealerScore < 17) {
            gameInstance.dealerHand.push(_drawCard(player));
            gameInstance.dealerScore = _calculateHandScore(gameInstance.dealerHand);
        }

        if ((gameInstance.playerScore < gameInstance.dealerScore && gameInstance.dealerScore > 21) ||
            (gameInstance.playerScore > gameInstance.dealerScore && gameInstance.playerScore <= 21)) {
            // Player wins
            gameInstance.gameStatus = "Win";
            gameInstance.claimableAmount += gameInstance.betAmount * 2;
        } else if (gameInstance.playerScore == gameInstance.dealerScore) {
            // Draw
            gameInstance.gameStatus = "Draw";
            gameInstance.claimableAmount += gameInstance.betAmount;
        } else {
            gameInstance.gameStatus = "Lose";
        }

        emit Stand(gameInstance.player, gameInstance.playerHand, gameInstance.dealerHand, gameInstance.claimableAmount, gameInstance.dealerScore, gameInstance.playerScore, gameInstance.gameStatus);

        _resetGameInstance(player);
    }

    /**
     * @dev Allows a player to withdraw their available claimableAmount at any time.
     * Players can withdraw their winnings or available balance independently of the game status.
     * Emits a "Claim" event to log the successful withdrawal.
     */
    function claim() public {
        address player = msg.sender;
        GameInstance storage gameInstance = gamesByPlayer[player];
        uint claimableAmount = gameInstance.claimableAmount;
        require(claimableAmount > 0, "Claimable amount not available");

        (bool success, ) = payable(msg.sender).call{value: claimableAmount}("");

        require(success, "Claim failed");

        delete gameInstance.claimableAmount;

        emit Claim(gameInstance.player, gameInstance.claimableAmount);
    }

    /**
     * @dev Draws a card for the player in the game.
     * @notice This function simulates drawing a card from the player's deck during the game of blackjack.
     * @dev It retrieves the next card from the player's deck, updates the turn counter, and returns the card.
     * @param player The address of the player for whom the card is drawn.
     * @return card An array representing the drawn card, where card[0] is the card rank and card[1] is the suit index.
     */
    function _drawCard(address player) private returns (uint8[2] memory) {
        GameInstance storage gameInstance = gamesByPlayer[player];

        uint8[2] memory card = gameInstance.deck[gameInstance.turnCounter];

        gameInstance.turnCounter++;

        return card;
    }

    /**
     * @dev Shuffles the deck of cards for a specific player's game instance.
     * @param player The address of the player for whom the deck should be shuffled.
     * @param blockNumber The block number used for generating randomness.
     */
    function _shuffleDeck(address player, uint blockNumber) private {
        uint8[2][] memory newDeck = unsortedDeck;
        GameInstance storage gameInstance = gamesByPlayer[player];

        // Iterate over the new deck and shuffle it using block-related randomness.
        for (uint i = 0; i < newDeck.length; i++) {
            uint randomIndex = i + uint(keccak256(abi.encodePacked(block.timestamp, blockNumber, i))) % (newDeck.length - i);
            uint8[2] memory temp = newDeck[randomIndex];
            newDeck[randomIndex] = newDeck[i];
            newDeck[i] = temp;
        }

        // Update the player's game instance with the shuffled deck.
        gameInstance.deck = newDeck;
    }

    /**
     * @dev Calculates the total score of a hand in the game based on the card values.
     * @param hand An array of card values in the format [rank, suit].
     * @return The calculated hand score as a uint8.
     */
    function _calculateHandScore(uint8[2][] memory hand) private pure returns (uint8) {
        uint8 handScore = 0;  // Initialize the hand score to zero.
        uint8 acesCount = 0;  // Initialize the count of Aces in the hand to zero.

        // Iterate over each card in the hand and calculate the score.
        for (uint8 i = 0; i < hand.length; i++) {
            uint8 cardValue = hand[i][0];  // Get the card value (e.g., Ace, 2, 3, ...).
            if (cardValue == 1) {
                acesCount++;             // If the card is an Ace, increment the count.
                handScore += 11;         // Add 11 to the hand score for the Ace.
            } else if (cardValue >= 10) {
                handScore += 10;         // Add 10 to the hand score for face cards (10, Jack, Queen, King).
            } else {
                handScore += cardValue;  // Add the card value to the hand score for other cards.
            }
        }

        // Adjust the score for Aces if the total score exceeds 21.
        while (acesCount > 0 && handScore > 21) {
            handScore -= 10;  // Reduce the score by 10 for each Ace to avoid busting.
            acesCount--;      // Decrement the count of Aces.
        }

        return handScore;  // Return the final calculated hand score.
    }

    /**
     * @dev Resets the game instance for a player, clearing all game-related data.
     * @notice This function is called at the end of a game to reset the player's game state.
     */
    function _resetGameInstance(address player) private {
        GameInstance storage gameInstance = gamesByPlayer[player];

        // Reset all game-related data to default values
        gameInstance.gameId = 0;
        gameInstance.betAmount = 0;
        gameInstance.gameStatus = "Not started";
        delete gameInstance.firstDealerCard;
        delete gameInstance.dealerHand;
        delete gameInstance.playerHand;
        gameInstance.dealerScore = 0;
        gameInstance.playerScore = 0;
        gameInstance.turnCounter = 0;
    }

    // Function to get the values of minBet and maxBet as an array
    function getBetLimits() public view returns (uint256[2] memory) {
        uint256[2] memory limits;
        limits[0] = minBet;
        limits[1] = maxBet;
        return limits;
    }

    // Function to update the minimum bet amount.
    function setMinBet(uint256 newMinBet) public isOwner {
        require(newMinBet > 0, "Minimum bet must be greater than zero");
        minBet = newMinBet;
    }

    // Function to update the maximum bet amount.
    function setMaxBet(uint256 newMaxBet) public isOwner {
        require(newMaxBet >= minBet, "Maximum bet must be greater than or equal to minimum bet");
        maxBet = newMaxBet;
    }

    /**
     * @dev Allows the contract owner to withdraw a specified amount of Ether.
     * @param amount The amount of Ether to withdraw.
     */
    function withdraw(uint256 amount) public isOwner {
        require(amount > 0, "Withdraw amount must be greater than zero");
        require(amount <= address(this).balance, "Insufficient balance");

        (bool success, ) = owner.call{ value: amount }("");
        require(success, "Failed to send Ether");
    }

    /**
     * This function is essential when you want to allow other users or contracts
     * to send Ether to your contract without explicitly calling a specific method.
     */
    receive() external payable {}
}

