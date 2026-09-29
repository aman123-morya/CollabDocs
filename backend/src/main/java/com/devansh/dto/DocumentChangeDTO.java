package com.devansh.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DocumentChangeDTO {

    private String id;
    private String left;
    private String right;
    private String content;
    private String operation;
    @JsonProperty("isdeleted")
    private boolean isdeleted;

    @JsonProperty("isbold")
    private boolean isbold;
    @JsonProperty("isitalic")
    private boolean isitalic;

    /** Set by the server on every broadcast: the document version right after this operation. */
    private long seq;

    /** Opaque id of the browser session that produced the change; echoed back so it can skip its own edits. */
    private String origin;

    @JsonIgnore
    public boolean getIsDeleted(){
        return isdeleted;
    }
    @JsonIgnore
    public boolean getIsBold(){
        return isbold;
    }
    @JsonIgnore
    public boolean getIsItalic(){
        return isitalic;
    }


}
