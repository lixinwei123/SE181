import { Component, OnInit } from '@angular/core';
import { Square } from 'src/models/square';
import { Observable, empty, combineLatest } from 'rxjs';
import { DbService } from '../services/db.service';
import { AuthService } from '../services/auth.service';
import { tap, take } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.page.html',
  styleUrls: ['./game-board.page.scss'],
})
//every time a player makes a move, update only one cell, set on click event on empty cell,
//capture empty cell coordinate, send the coordinate via firebase to update other player's move
//needs to populate checkerSquares by determining whether if one is black side or white side.
//
// { game

export class GameBoardPage implements OnInit {
   checkerSquares$: Observable<Array<Array<Square>>>; 
   checkerSquares: Array<Array<Square>> = [];
   isPlayerWhite = true; //This variable should be set from firebase upon making game via randomization 
   isPieceSelected = false; 
   selectedPiece: any;
   isWhiteMove = true;
   gameID: string = 'randomGameId';
  constructor(
    protected authService: AuthService,
    protected dbService: DbService,
    protected activatedRoute: ActivatedRoute,
  ) {
    // this.initialBlackSide();
    console.log(this.checkerSquares);
   }

  ngOnInit() {

    // Get Game ID from route
    this.activatedRoute.params.subscribe(params => {
      this.gameID = params['id'];
      this.initializePlayer().subscribe(_ => {
        if (this.isPlayerWhite) {
          this.checkerSquares = this.initializeBoard();
          this.dbService.updateObjectAtPath(`games/${this.gameID}/board`, this.checkerSquares);
          this.checkerSquares$ = this.dbService.getObjectValues(`games/${this.gameID}/board`);
        }

      })
    })
  }

  //if the player is host, dont change anything, else changew isplayerwhite to false 
  initializePlayer(): Observable<any> {
    const uid$ = this.authService.getUserId();
    // First person in lobby is white. Second person is black.
    const whitePlayerPath = `games/${this.gameID}/whitePlayerUID`
    const isFirst$ = this.dbService.getObjectValues<string>(whitePlayerPath);
    return isFirst$.pipe(
      take(1), // Ensures this only runs once per person.
      tap(whiteUID => {
        uid$.subscribe(uid => {
          if (whiteUID != uid) {
            // You're the second person as white UID already exist.
            this.isPlayerWhite = false;
            uid$.subscribe(uid => {
              this.dbService.updateObjectAtPath(`games/${this.gameID}`, {blackPlayerUID: uid})
            })
            return;

          }
          else {
            // You're the first person. You are now white.
            this.isPlayerWhite = true;

            // Claim my rights as the first player.
            uid$.subscribe(uid => {
              this.dbService.updateObjectAtPath(`games/${this.gameID}`, {whitePlayerUID: uid});
            })
            return;

          }

        })
      })
    );
    
  }
  
  initializeBoard(): Array<Array<Square>> {
    let rowMax = 8;
    let colMax = 8;
    let checkerSquares: Array<Array<Square>> = [];
    for(let i=0; i < rowMax;i++){
      let rowList = []
      for(let j =0; j < colMax; j++){
        let row,col;
        if(this.isPlayerWhite){ //if player is white, make sure to record location of square separate from black
          row = rowMax - 1 - i;
          col = colMax - 1 - j;
        }else{
          row = i;
          col = j;
        }
        let squareObj: Square = {
          row: row,
          col: col,
          isEmpty: false, //is white square or dark square
          hasPiece:false, //check to see if this location has any piece
          isWhite: this.isPlayerWhite,  // purpose is to rendar board at different location depending on the player
          isKing: false //if the piece is kinged 
        };
        if((i % 2 == 0 && j % 2 == 0) || (i % 2 == 1 && j % 2 == 1)){
          squareObj.isEmpty = true;
          squareObj.hasPiece = false;
        }else{
          if(i == 4 || i == 3){
            squareObj.isEmpty = false;
            squareObj.hasPiece = false;
          }else if(i > 4){ //if board rendaring is at bottom,default player red/white is at bottom side
            squareObj.isEmpty=false;
            squareObj.hasPiece = true;
            squareObj.isWhite = this.isPlayerWhite;
          }
          else{ //if board is at top side, default, black player is at top side 
            squareObj.isEmpty = false;
            squareObj.hasPiece = true;
            squareObj.isWhite = !this.isPlayerWhite;
          }
        }
        rowList.push(squareObj);
      }
      checkerSquares.push(rowList)
    }
    return checkerSquares;
    
  }

    selectPiece(squareObj){
      this.isPieceSelected = true;
      this.selectedPiece =squareObj
      console.log("piece selected!",squareObj)
    }

  /**
   * 
   * @param squareObj the destination square
   */
  makeMove(squareObj: Square){
    // Does not make move under these conditions:
    // 1. Piece is not selected
    // 2. The square has a piece already on it
    // 3. When it's white move, has to select a white piece.
    if(!this.isPieceSelected || squareObj.hasPiece == true || this.selectedPiece.isWhite != this.isWhiteMove){
      console.log("bad")
      return;
    }
    let row, col,row2,col2;
    //make sure that the perspecive position is correct 
    if(this.isPlayerWhite){
      row2 = 7 - this.selectedPiece.row;
      col2 = 7 - this.selectedPiece.col;
      row = 7 - squareObj.row; 
      col = 7 - squareObj.col;
    }else{
      row2 = this.selectedPiece.row;
      col2 = this.selectedPiece.col;
      row = squareObj.row;
      col = squareObj.col;
    }
    let isValidMove = false

    if(this.isWhiteMove){
      console.log("empty square")
      if(!squareObj.isEmpty && ( (this.validateCapture([row,col],[row2,col2],this.isWhiteMove,this.selectedPiece.isKing) ) ||
        (row2 - 1 == row ) || 
      (this.selectedPiece.isKing || (row2 -1 == row ||row2 + 1 == row)))
      ){
        console.log("made move successfful")
        isValidMove = true;
      }
      if(row == 0){
        this.checkerSquares[row][col].isKing = true
        console.log("kinged!")
      }
    }else{
      // console.log(this.validateCapture([row,col],[row2,col2],this.isWhiteMove));
      if(!squareObj.isEmpty && ( (this.validateCapture([row,col],[row2,col2],this.isWhiteMove,this.selectedPiece.isKing) ) || (row2 + 1 == row ) || 
      (this.selectedPiece.isKing || (row2 + 1 == row ||row2 - 1 == row))
     
      )){
        console.log("made move successfful")
        isValidMove = true;
        if(row == 7){
          this.checkerSquares[row][col].isKing = true
          console.log("kinged!")
        }
      }
    }
    if (isValidMove){
      this.checkerSquares[row][col].hasPiece = true
      this.checkerSquares[row][col].isWhite = this.selectedPiece.isWhite;
      this.checkerSquares[row2][col2].hasPiece = false
      this.isWhiteMove = !this.isWhiteMove;
      if(this.selectedPiece.isKing){
        this.checkerSquares[row][col].isKing = true;
        this.checkerSquares[row2][col2].isKing = false
      }
    }
    this.dbService.updateObjectAtPath(`games/${this.gameID}/board`, this.checkerSquares);
  }

  // TODO: returns white if white wins. Black if black wins. Neither if no one has won.
  checkWinCondition(): 'white' | 'black' | 'neither' {
    return;
  }

  validateCapture(emptySquare,piece,isWhiteMove,isKing){
    console.log("piece is",piece)
    console.log("wang to move is",emptySquare)
    if(emptySquare[0]== piece[0] && emptySquare[1] == piece[1]){
      return true
    }else if(emptySquare[0] < 0 || emptySquare[1] < 0 || emptySquare[0] > 7 ||  emptySquare[1] > 7){
      return false
    }
    else{
      let row,row2,col1,col2
      if(isKing){
        if(emptySquare[0] < piece[0]){
          row = emptySquare[0]+ 1
          row2 = row + 1;
        }else{
          row = emptySquare[0] -1 
          row2 = row - 1
        }
      }
      else if(isWhiteMove){
        row = emptySquare[0]+ 1
        row2 = row + 1;
      }else{
        row = emptySquare[0] -1 
        row2 = row - 1
      }
      col1 = emptySquare[1] + 1
      col2 = emptySquare[1] - 1
      let cond1,cond2;
      if (this.checkerSquares[row] != undefined && this.checkerSquares[row][col1] != undefined && this.checkerSquares[row][col1].hasPiece == true && this.checkerSquares[row][col1].isWhite != isWhiteMove){
        console.log("exe1")
        cond1 = this.validateCapture([row2,col1 + 1],piece,isWhiteMove,isKing)
        if(cond1 == true){
          this.checkerSquares[row][col1].hasPiece = false;
          if(this.checkerSquares[row][col1].isKing){
            this.checkerSquares[row][col1].isKing = false
          }
        }
      }
      if(this.checkerSquares[row] != undefined && this.checkerSquares[row][col2] != undefined && this.checkerSquares[row][col2].hasPiece == true && this.checkerSquares[row][col2].isWhite != isWhiteMove)
      console.log("exe2")
        cond2 = this.validateCapture([row2,col2 - 1],piece,isWhiteMove,isKing)
        if(cond2 == true){
          this.checkerSquares[row][col2].hasPiece = false;
          if(this.checkerSquares[row][col1].isKing){
            this.checkerSquares[row][col1].isKing = false
          }
        }
      return cond1 || cond2
    }

  }

}
