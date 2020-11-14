import { Component, OnInit } from '@angular/core';
import { Square } from 'src/models/square';
import { Observable } from 'rxjs';
import { DbService } from '../services/db.service';

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.page.html',
  styleUrls: ['./game-board.page.scss'],
})
//every time a player makes a move, update only one cell, set on click event on empty cell,
//capture empty cell coordinate, send the coordinate via firebase to update other player's move
//needs to populate checkerSquares by determining whether if one is black side or white side.
//
export class GameBoardPage implements OnInit {
   checkerSquares: Observable<Array<Array<Square>>>; 
   isPlayerWhite = true; //This variable should be set from firebase upon making game via randomization 
   isPieceSelected = false; 
   selectedPiece: any;
  constructor(
    protected dbService: DbService,
  ) {
    // this.initialBlackSide();
    console.log(this.checkerSquares);
   }

  ngOnInit() {
    if (this.isPlayerWhite) {
      let checkerSquares = this.initializeBoard();
      let gameId = 'randomgameid';
      this.dbService.updateObjectAtPath(`games/${gameId}/board`, checkerSquares);
      this.checkerSquares = this.dbService.getObjectValues(`games/${gameId}/board`);
    }
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
          isEmpty: false,
          hasPiece:false,
          isWhite: this.isPlayerWhite,
          isKing: false
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
    }

  //push this to firebase, make sure that checkerSquares list is subscribed to the changes of firebase
  makeMove(squareObj){
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

    if(this.isPieceSelected && squareObj.hasPiece == false && !squareObj.isEmpty && ((row2 - 1 == row ) || (this.selectedPiece.isKing && (row2 -1 == row ||row2 + 1 == row)))){
      this.checkerSquares[row][col].hasPiece = true
      this.checkerSquares[row][col].isWhite = this.selectedPiece.isWhite;
      this.checkerSquares[row2][col2].hasPiece = false
    }
    if(row == 0){
      this.checkerSquares[row][col].isKing = true
      console.log("kinged!")
    }
    console.log(squareObj)
  }

}
